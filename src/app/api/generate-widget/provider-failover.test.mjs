import assert from "node:assert/strict";
import test from "node:test";

test("runGroqPrimaryOpenRouterFallback tries OpenRouter when Groq fails", async () => {
  const originalGroqKey = process.env.GROQ_API_KEY;
  const originalOpenRouterKey = process.env.OPENROUTER_API_KEY;

  process.env.GROQ_API_KEY = "gsk_invalid_key_for_unit_test";
  process.env.OPENROUTER_API_KEY = "sk-or-test-key";

  const { runGroqPrimaryOpenRouterFallback } = await import("./provider-failover.ts");

  let groqAttempts = 0;
  let openRouterAttempts = 0;

  const result = await runGroqPrimaryOpenRouterFallback(
    async (_client, provider) => {
      if (provider === "groq") {
        groqAttempts += 1;
        throw new Error("Groq unavailable");
      }

      openRouterAttempts += 1;
      return "openrouter-success";
    },
    { operation: "unit-test" },
  );

  assert.equal(groqAttempts, 1);
  assert.equal(openRouterAttempts, 1);
  assert.equal(result.provider, "openrouter");
  assert.equal(result.value, "openrouter-success");

  if (originalGroqKey === undefined) {
    delete process.env.GROQ_API_KEY;
  } else {
    process.env.GROQ_API_KEY = originalGroqKey;
  }

  if (originalOpenRouterKey === undefined) {
    delete process.env.OPENROUTER_API_KEY;
  } else {
    process.env.OPENROUTER_API_KEY = originalOpenRouterKey;
  }
});

test("runGroqPrimaryOpenRouterFallback does not fallback after partial output", async () => {
  const originalGroqKey = process.env.GROQ_API_KEY;
  const originalOpenRouterKey = process.env.OPENROUTER_API_KEY;

  process.env.GROQ_API_KEY = "gsk_invalid_key_for_unit_test";
  process.env.OPENROUTER_API_KEY = "sk-or-test-key";

  const { runGroqPrimaryOpenRouterFallback } = await import("./provider-failover.ts");

  const partialError = new Error("Stream interrupted");
  Object.assign(partialError, { emittedOutput: true });

  await assert.rejects(
    () =>
      runGroqPrimaryOpenRouterFallback(
        async (_client, provider) => {
          if (provider === "groq") {
            throw partialError;
          }

          return "should-not-run";
        },
        {
          canFallbackOnError: (error) => !error || typeof error !== "object" || !("emittedOutput" in error) || !error.emittedOutput,
          operation: "unit-test-partial",
        },
      ),
    /Stream interrupted/,
  );

  if (originalGroqKey === undefined) {
    delete process.env.GROQ_API_KEY;
  } else {
    process.env.GROQ_API_KEY = originalGroqKey;
  }

  if (originalOpenRouterKey === undefined) {
    delete process.env.OPENROUTER_API_KEY;
  } else {
    process.env.OPENROUTER_API_KEY = originalOpenRouterKey;
  }
});
