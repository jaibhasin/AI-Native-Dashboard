import { readFileSync } from "node:fs";
import { join } from "node:path";
import { exampleWidgetDataSchema, type ExampleWidgetData } from "@/lib/dashboard-schemas";
import type { WidgetStreamEvent } from "@/lib/widget-stream";
import { createExampleData } from "./example-data";
import { openuiUserPrompt } from "./prompts";
import {
  createChatCompletion,
  emittedOutputBeforeError,
  getUIModel,
  type ChatCompletionStream,
  type ModelClient,
} from "./provider";
import { runGroqPrimaryOpenRouterFallback } from "./provider-failover";
import { errorMessage } from "./shared";
import type { AIProvider } from "./shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENUI_PROMPT_PATH = join(process.cwd(), "src/generated/openui-dashboard-prompt.txt");

let cachedOpenUIPrompt: string | null = null;

class WidgetGenerationError extends Error {
  emittedOutput: boolean;
  emittedUiDelta: boolean;

  constructor(error: unknown, emittedOutput: boolean, emittedUiDelta: boolean) {
    super(errorMessage(error));
    this.name = "WidgetGenerationError";
    this.emittedOutput = emittedOutput;
    this.emittedUiDelta = emittedUiDelta;
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
    const exampleData = providedExampleData ?? (await createExampleData(client, provider, prompt));

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

async function generateWithGroqPrimary(
  prompt: string,
  controller: ReadableStreamDefaultController,
  providedExampleData?: ExampleWidgetData | null,
) {
  await runGroqPrimaryOpenRouterFallback(
    (client, provider) => generateWithClient(client, provider, prompt, controller, providedExampleData),
    {
      canFallbackOnError: (error) => !emittedOutputBeforeError(error),
      operation: "widget-generation",
    },
  );
}

export async function POST(request: Request) {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body = (await request.json()) as { exampleData?: unknown; prompt?: unknown };
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

        await generateWithGroqPrimary(prompt, controller, exampleData);
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
