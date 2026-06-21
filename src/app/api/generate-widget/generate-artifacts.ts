import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExampleWidgetData } from "@/lib/dashboard-schemas";
import { createExampleData } from "./example-data";
import { openuiUserPrompt } from "./prompts";
import {
  createChatCompletion,
  createModelClient,
  getApiKeys,
  getUIModel,
  type ChatCompletionStream,
  type ModelClient,
} from "./provider";
import type { AIProvider } from "./shared";

const OPENUI_PROMPT_PATH = join(process.cwd(), "src/generated/openui-dashboard-prompt.txt");

let cachedOpenUIPrompt: string | null = null;

export type WidgetArtifacts = {
  exampleData: ExampleWidgetData;
  openuiSource: string;
};

function getOpenUIPrompt() {
  cachedOpenUIPrompt ??= readFileSync(OPENUI_PROMPT_PATH, "utf8");

  return cachedOpenUIPrompt;
}

async function collectOpenUISource(
  client: ModelClient,
  provider: AIProvider,
  prompt: string,
  exampleData: ExampleWidgetData,
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

  let openuiSource = "";

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;

    if (delta) {
      openuiSource += delta;
    }
  }

  return openuiSource.trim();
}

export async function generateWidgetArtifacts(
  client: ModelClient,
  provider: AIProvider,
  prompt: string,
  providedExampleData?: ExampleWidgetData | null,
): Promise<WidgetArtifacts> {
  const exampleData = providedExampleData ?? (await createExampleData(client, provider, prompt));
  const openuiSource = await collectOpenUISource(client, provider, prompt, exampleData);

  if (!openuiSource) {
    throw new Error("OpenUI generation returned no widget source.");
  }

  return {
    exampleData,
    openuiSource,
  };
}

export function createGenerationClient(provider: AIProvider = "openrouter") {
  const apiKeys = getApiKeys(provider);

  if (apiKeys.length === 0) {
    throw new Error(
      provider === "openrouter"
        ? "Missing OPENROUTER_API_KEY. Add it to your environment and retry."
        : "Missing GROQ_API_KEY or GROQ_API_KEYS. Add it to your environment and retry.",
    );
  }

  return createModelClient(provider, apiKeys[0]);
}
