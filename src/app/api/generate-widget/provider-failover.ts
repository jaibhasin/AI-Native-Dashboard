import {
  chooseGroqKey,
  coolDownGroqKey,
  createModelClient,
  getApiKeys,
  wasRateLimited,
  type ModelClient,
} from "./provider";
import type { AIProvider } from "./shared";

type FailoverOptions = {
  canFallbackOnError?: (error: unknown) => boolean;
  operation?: string;
};

export async function runGroqKeyPool<T>(
  run: (client: ModelClient) => Promise<T>,
  options?: FailoverOptions,
): Promise<T> {
  const apiKeys = getApiKeys("groq");
  let lastError: unknown = null;

  for (let attempt = 0; attempt < apiKeys.length; attempt += 1) {
    const selected = chooseGroqKey(apiKeys);

    if (!selected) {
      break;
    }

    try {
      return await run(createModelClient("groq", selected.apiKey));
    } catch (error) {
      if (options?.canFallbackOnError && !options.canFallbackOnError(error)) {
        throw error;
      }

      lastError = error;

      if (wasRateLimited(error)) {
        coolDownGroqKey(selected.apiKey);
      }
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error("All configured Groq API keys are cooling down.");
}

export async function runGroqPrimaryOpenRouterFallback<T>(
  run: (client: ModelClient, provider: AIProvider) => Promise<T>,
  options?: FailoverOptions,
): Promise<{ provider: AIProvider; value: T }> {
  const groqApiKeys = getApiKeys("groq");
  const openRouterApiKeys = getApiKeys("openrouter");

  if (groqApiKeys.length > 0) {
    try {
      const value = await runGroqKeyPool((client) => run(client, "groq"), options);

      return { provider: "groq", value };
    } catch (groqError) {
      if (options?.canFallbackOnError && !options.canFallbackOnError(groqError)) {
        throw groqError;
      }

      if (openRouterApiKeys.length === 0) {
        throw groqError;
      }

      console.warn(
        `[llm-failover] ${options?.operation ?? "request"}: Groq failed; trying OpenRouter backup.`,
        groqError instanceof Error ? groqError.message : groqError,
      );
    }
  } else if (openRouterApiKeys.length === 0) {
    throw new Error("Missing GROQ_API_KEY or GROQ_API_KEYS. Add it to your environment and retry.");
  } else {
    console.warn(`[llm-failover] ${options?.operation ?? "request"}: No Groq keys configured; using OpenRouter.`);
  }

  if (openRouterApiKeys.length === 0) {
    throw new Error("Missing OPENROUTER_API_KEY. Add it to your environment and retry.");
  }

  const value = await run(createModelClient("openrouter", openRouterApiKeys[0]), "openrouter");

  return { provider: "openrouter", value };
}
