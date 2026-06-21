import { readFileSync } from "node:fs";
import { join } from "node:path";
import { exampleWidgetDataSchema, type ExampleWidgetData } from "@/lib/dashboard-schemas";
import type { WidgetStreamEvent } from "@/lib/widget-stream";
import { createExampleData } from "./example-data";
import { openuiUserPrompt } from "./prompts";
import {
  chooseGroqKey,
  coolDownGroqKey,
  createChatCompletion,
  createModelClient,
  emittedOutputBeforeError,
  getApiKeys,
  getUIModel,
  keyLabel,
  resolveProvider,
  wasRateLimited,
  type ChatCompletionStream,
  type ModelClient,
} from "./provider";
import { errorMessage } from "./shared";
import type { AIProvider } from "./shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENUI_PROMPT_PATH = join(process.cwd(), "src/generated/openui-dashboard-prompt.txt");

let cachedOpenUIPrompt: string | null = null;

class WidgetGenerationError extends Error {
  emittedOutput: boolean;
  emittedUiDelta: boolean;
  rateLimited: boolean;

  constructor(error: unknown, emittedOutput: boolean, emittedUiDelta: boolean) {
    super(errorMessage(error));
    this.name = "WidgetGenerationError";
    this.emittedOutput = emittedOutput;
    this.emittedUiDelta = emittedUiDelta;
    this.rateLimited = wasRateLimited(error);
  }
}

function getOpenUIPrompt() {
  cachedOpenUIPrompt ??= readFileSync(OPENUI_PROMPT_PATH, "utf8");

  return cachedOpenUIPrompt;
}

function streamEvent(controller: ReadableStreamDefaultController, event: WidgetStreamEvent) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
}

async function streamOpenUI(
  client: ModelClient,
  provider: AIProvider,
  prompt: string,
  exampleData: Parameters<typeof openuiUserPrompt>[1],
  controller: ReadableStreamDefaultController,
  streamState?: { emittedOutput: boolean; emittedUiDelta: boolean },
) {
  const stream = (await createChatCompletion(client, {
    model: getUIModel(provider),
    messages: [
      {
        role: "system",
        content: getOpenUIPrompt(),
      },
      {
        role: "user",
        content: openuiUserPrompt(prompt, exampleData),
      },
    ],
    max_completion_tokens: 1800,
    ...(provider === "groq" ? { temperature: 0.15 } : {}),
    stream: true,
  })) as ChatCompletionStream;

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;

    if (delta) {
      if (streamState) {
        streamState.emittedOutput = true;
        streamState.emittedUiDelta = true;
      }

      streamEvent(controller, {
        type: "uiDelta",
        delta,
      });
    }
  }
}

async function generateWithClient(
  client: ModelClient,
  provider: AIProvider,
  prompt: string,
  controller: ReadableStreamDefaultController,
  providedExampleData?: ExampleWidgetData | null,
) {
  const streamState = { emittedOutput: false, emittedUiDelta: false };

  try {
    const exampleData = providedExampleData ?? await createExampleData(client, provider, prompt);

    streamEvent(controller, {
      type: "exampleData",
      data: exampleData,
    });
    streamState.emittedOutput = true;

    await streamOpenUI(client, provider, prompt, exampleData, controller, streamState);
  } catch (error) {
    throw new WidgetGenerationError(error, streamState.emittedOutput, streamState.emittedUiDelta);
  }

  streamEvent(controller, {
    type: "done",
  });
}

async function generateWithGroqFailover(
  apiKeys: string[],
  prompt: string,
  controller: ReadableStreamDefaultController,
  providedExampleData?: ExampleWidgetData | null,
) {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < apiKeys.length; attempt += 1) {
    const selected = chooseGroqKey(apiKeys);

    if (!selected) {
      break;
    }

    const client = createModelClient("groq", selected.apiKey);

    try {
      await generateWithClient(client, "groq", prompt, controller, providedExampleData);
      return;
    } catch (error) {
      if (emittedOutputBeforeError(error)) {
        throw error;
      }

      lastError = error;

      if (wasRateLimited(error)) {
        coolDownGroqKey(selected.apiKey);
      }

      if (attempt < apiKeys.length - 1) {
        console.warn(`${keyLabel(selected.index, apiKeys.length)} failed before streaming UI; trying the next Groq key.`);
      }
    }
  }

  if (lastError && wasRateLimited(lastError)) {
    throw new Error("All configured Groq API keys are currently rate limited. Wait a minute, then retry.");
  }

  if (lastError) {
    throw new Error(`All configured Groq API keys failed before streaming UI. Last error: ${errorMessage(lastError)}`);
  }

  throw new Error("All configured Groq API keys are cooling down. Wait a minute, then retry.");
}

async function generateWithGroqPrimary(
  prompt: string,
  controller: ReadableStreamDefaultController,
  providedExampleData?: ExampleWidgetData | null,
) {
  const groqApiKeys = getApiKeys("groq");

  if (groqApiKeys.length === 0) {
    throw new Error("Missing GROQ_API_KEY or GROQ_API_KEYS. Add it to your environment and retry.");
  }

  try {
    await generateWithGroqFailover(groqApiKeys, prompt, controller, providedExampleData);
    return;
  } catch (groqError) {
    if (emittedOutputBeforeError(groqError)) {
      throw groqError;
    }

    const openRouterApiKeys = getApiKeys("openrouter");

    if (openRouterApiKeys.length === 0) {
      throw new Error(`Groq failed before streaming output, and OpenRouter backup is not configured. Missing OPENROUTER_API_KEY. Groq error: ${errorMessage(groqError)}`);
    }

    try {
      await generateWithClient(createModelClient("openrouter", openRouterApiKeys[0]), "openrouter", prompt, controller, providedExampleData);
    } catch (openRouterError) {
      throw new Error(`Groq failed before streaming output, and OpenRouter backup also failed. OpenRouter error: ${errorMessage(openRouterError)}. Groq error: ${errorMessage(groqError)}`);
    }
  }
}

export async function POST(request: Request) {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body = (await request.json()) as { exampleData?: unknown; prompt?: unknown };
        const provider = resolveProvider(process.env.AI_PROVIDER);
        const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
        const parsedExampleData = exampleWidgetDataSchema.safeParse(body.exampleData);
        const exampleData = parsedExampleData.success ? parsedExampleData.data : null;

        if (!prompt) {
          streamEvent(controller, {
            type: "error",
            error: "Enter a prompt before generating a widget.",
          });
          return;
        }

        if (provider === "groq") {
          await generateWithGroqPrimary(prompt, controller, exampleData);
        } else {
          const apiKeys = getApiKeys(provider);

          if (apiKeys.length === 0) {
            streamEvent(controller, {
              type: "error",
              error: "Missing OPENROUTER_API_KEY. Add it to your environment and retry.",
            });
            return;
          }

          await generateWithClient(createModelClient(provider, apiKeys[0]), provider, prompt, controller, exampleData);
        }
      } catch (error) {
        streamEvent(controller, {
          type: "error",
          error: errorMessage(error),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "application/x-ndjson; charset=utf-8",
    },
  });
}
