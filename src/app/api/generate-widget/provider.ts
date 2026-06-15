import Groq from "groq-sdk";
import OpenAI from "openai";
import { asRecord, asString, type AIProvider, aiProviderSchema } from "./shared";

const DEFAULT_UI_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_MOCK_DATA_MODEL = "openai/gpt-oss-20b";
const DEFAULT_OPENAI_MODEL = "gpt-5.5";
const GROQ_RATE_LIMIT_COOLDOWN_MS = 60_000;

let groqKeyCursor = 0;
const groqKeyCooldowns = new Map<string, number>();

export type ModelClient = Groq | OpenAI;
export type ChatCompletionResult = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};
export type ChatCompletionStream = AsyncIterable<{
  choices?: Array<{
    delta?: {
      content?: string | null;
    };
  }>;
}>;

export function resolveProvider(value: unknown): AIProvider {
  const parsed = aiProviderSchema.safeParse(value);

  return parsed.success ? parsed.data : "groq";
}

export function providerDisplayName(provider: AIProvider) {
  return provider === "openai" ? "OpenAI" : "Groq";
}

function splitApiKeys(value: string | undefined) {
  return (
    value
      ?.split(/[\s,]+/)
      .map((key) => key.trim())
      .filter(Boolean) ?? []
  );
}

export function getApiKeys(provider: AIProvider) {
  if (provider === "openai") {
    return splitApiKeys(process.env.OPENAI_API_KEY);
  }

  const numberedKeys = Object.entries(process.env)
    .filter(([name]) => /^GROQ_API_KEY_\d+$/.test(name))
    .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
    .flatMap(([, value]) => splitApiKeys(value));
  const keyPool = [...splitApiKeys(process.env.GROQ_API_KEYS), ...numberedKeys];

  return keyPool.length > 0 ? keyPool : splitApiKeys(process.env.GROQ_API_KEY);
}

export function keyLabel(index: number, total: number) {
  return total > 1 ? `Groq key ${index + 1}/${total}` : "Groq key";
}

export function isRateLimitError(error: unknown) {
  const record = asRecord(error);
  const status = record.status;
  const code = asString(record.code).toLowerCase();
  const name = asString(record.name).toLowerCase();
  const message = asString(record.message).toLowerCase();

  return (
    status === 429 ||
    code.includes("rate") ||
    name.includes("ratelimit") ||
    message.includes("rate limit") ||
    message.includes("rate_limit")
  );
}

export function wasRateLimited(error: unknown) {
  return isRateLimitError(error) || asRecord(error).rateLimited === true;
}

export function emittedUiDeltaBeforeError(error: unknown) {
  return asRecord(error).emittedUiDelta === true;
}

export function chooseGroqKey(apiKeys: string[]) {
  const now = Date.now();
  const availableKeys = apiKeys
    .map((apiKey, index) => ({ apiKey, index }))
    .filter(({ apiKey }) => (groqKeyCooldowns.get(apiKey) ?? 0) <= now);

  if (availableKeys.length === 0) {
    return null;
  }

  const selected = availableKeys[groqKeyCursor % availableKeys.length];
  groqKeyCursor = (groqKeyCursor + 1) % Number.MAX_SAFE_INTEGER;

  return selected;
}

export function coolDownGroqKey(apiKey: string) {
  groqKeyCooldowns.set(apiKey, Date.now() + GROQ_RATE_LIMIT_COOLDOWN_MS);
}

export function getMockDataModel(provider: AIProvider) {
  if (provider === "openai") {
    return process.env.OPENAI_MOCK_DATA_MODEL || process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
  }

  return process.env.GROQ_MOCK_DATA_MODEL || DEFAULT_MOCK_DATA_MODEL;
}

export function getUIModel(provider: AIProvider) {
  if (provider === "openai") {
    return process.env.OPENAI_UI_MODEL || process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
  }

  return process.env.GROQ_UI_MODEL || DEFAULT_UI_MODEL;
}

export function createModelClient(provider: AIProvider, apiKey: string): ModelClient {
  return provider === "openai" ? new OpenAI({ apiKey }) : new Groq({ apiKey, maxRetries: 0 });
}

export async function createChatCompletion(client: ModelClient, params: Record<string, unknown>) {
  const completions = client.chat.completions as unknown as {
    create: (completionParams: Record<string, unknown>) => Promise<unknown>;
  };

  return completions.create(params);
}
