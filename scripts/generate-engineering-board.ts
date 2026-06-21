import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateWidgetArtifacts, createGenerationClient } from "../src/app/api/generate-widget/generate-artifacts";
import {
  BOARD_TEMPLATE_VERSION,
  buildWidgetClusterFromRect,
  flattenClusters,
  widgetClusterPosition,
  type BoardTemplate,
} from "../src/lib/board-template-core";
import {
  ENGINEERING_BOARD_ID,
  ENGINEERING_BOARD_NAME,
  engineeringWidgetSpecs,
} from "../src/lib/board-template-engineering.spec";

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
    // .env is optional if variables are already exported.
  }
}

async function main() {
  loadEnvFile();

  if (!process.env.OPENROUTER_MODEL) {
    process.env.OPENROUTER_MODEL = "anthropic/claude-sonnet-4.6";
  }

  const client = createGenerationClient("openrouter");
  const clusters = [];

  for (const [index, spec] of engineeringWidgetSpecs.entries()) {
    console.log(`Generating widget ${index + 1}/${engineeringWidgetSpecs.length}: ${spec.id}`);

    const { exampleData, openuiSource } = await generateWidgetArtifacts(client, "openrouter", spec.prompt);
    const widgetRect = widgetClusterPosition(spec.column, spec.row, 3, 3);

    clusters.push(
      buildWidgetClusterFromRect(spec.id, spec.prompt, widgetRect, exampleData, spec.supplements, openuiSource),
    );
  }

  const template: BoardTemplate = {
    id: ENGINEERING_BOARD_ID,
    name: ENGINEERING_BOARD_NAME,
    ...flattenClusters(clusters),
    generatedAt: new Date().toISOString(),
    templateVersion: BOARD_TEMPLATE_VERSION,
  } as BoardTemplate & { generatedAt: string; templateVersion: number };

  const outputPath = join(projectRoot, "src", "generated", "board-templates", "engineering.generated.json");

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(template, null, 2)}\n`, "utf8");

  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
