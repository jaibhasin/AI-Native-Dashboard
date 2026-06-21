import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateWidgetArtifacts } from "../src/app/api/generate-widget/generate-artifacts";
import { runGroqPrimaryOpenRouterFallback } from "../src/app/api/generate-widget/provider-failover";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptDir, "..");

function loadEnvFile() {
  const envPath = join(projectRoot, ".env");

  try {
    const contents = readFileSync(envPath, "utf8");

    for (const line of contents.split("\n")) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // optional
  }
}

async function main() {
  loadEnvFile();

  const savedGroqKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "gsk_invalid_key_for_fallback_test";

  try {
    const { provider, value } = await runGroqPrimaryOpenRouterFallback(
      (client, selectedProvider) =>
        generateWidgetArtifacts(client, selectedProvider, "Show PRs merged this week as a simple metrics widget."),
      { operation: "fallback-integration-test" },
    );

    console.log("Provider used:", provider);
    console.log("Title:", value.exampleData.title);
    console.log("OpenUI length:", value.openuiSource.length);
  } finally {
    if (savedGroqKey) {
      process.env.GROQ_API_KEY = savedGroqKey;
    }
  }
}

main().catch((error) => {
  console.error("Fallback test failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
