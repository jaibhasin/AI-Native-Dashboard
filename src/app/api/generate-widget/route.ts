import Groq from "groq-sdk";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { toJSONSchema } from "zod/v4";
import { exampleWidgetDataSchema, type ExampleWidgetData } from "@/lib/dashboard-schemas";
import type { WidgetStreamEvent } from "@/lib/widget-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_UI_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_MOCK_DATA_MODEL = "openai/gpt-oss-20b";
const OPENUI_PROMPT_PATH = join(process.cwd(), "src/generated/openui-dashboard-prompt.txt");

let cachedOpenUIPrompt: string | null = null;

function getOpenUIPrompt() {
  cachedOpenUIPrompt ??= readFileSync(OPENUI_PROMPT_PATH, "utf8");

  return cachedOpenUIPrompt;
}

function streamEvent(controller: ReadableStreamDefaultController, event: WidgetStreamEvent) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected generation error.";
}

function mockDataSystemPrompt() {
  return [
    "You generate realistic preview data for a dashboard widget.",
    "The data is for UI prototyping only, not factual source data.",
    "Return data that fits the user's dashboard request.",
    "Always set dataDisclosure to a concise sentence saying the values are AI-generated preview data.",
    "Use empty arrays for sections that do not fit the request.",
    "For charts, keep 4 to 8 points and 1 to 3 series.",
    "For tables, keep 3 to 6 rows.",
    "For forms, include formFields and keep unrelated data arrays empty unless a summary helps.",
  ].join("\n");
}

function openuiUserPrompt(prompt: string, exampleData: ExampleWidgetData) {
  return [
    "USER_PROMPT:",
    prompt,
    "",
    "EXAMPLE_DATA:",
    JSON.stringify(exampleData, null, 2),
    "",
    "Generate one compact OpenUI Lang widget from EXAMPLE_DATA.",
    "Use only values present in EXAMPLE_DATA.",
    "Return only OpenUI Lang.",
  ].join("\n");
}

async function createExampleData(groq: Groq, prompt: string) {
  const schema = toJSONSchema(exampleWidgetDataSchema);

  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MOCK_DATA_MODEL || DEFAULT_MOCK_DATA_MODEL,
    messages: [
      {
        role: "system",
        content: mockDataSystemPrompt(),
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "example_widget_data",
        strict: true,
        schema,
      },
    },
    reasoning_effort: "low",
    temperature: 0.2,
  });

  const content = completion.choices[0]?.message.content;

  if (!content) {
    throw new Error("Groq returned no example data.");
  }

  return exampleWidgetDataSchema.parse(JSON.parse(content));
}

async function streamOpenUI(
  groq: Groq,
  prompt: string,
  exampleData: ExampleWidgetData,
  controller: ReadableStreamDefaultController,
) {
  const stream = await groq.chat.completions.create({
    model: process.env.GROQ_UI_MODEL || DEFAULT_UI_MODEL,
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
    temperature: 0.15,
    max_completion_tokens: 1800,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta.content;

    if (delta) {
      streamEvent(controller, {
        type: "uiDelta",
        delta,
      });
    }
  }
}

export async function POST(request: Request) {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
          streamEvent(controller, {
            type: "error",
            error: "Missing GROQ_API_KEY. Add it to your environment and retry.",
          });
          return;
        }

        const body = (await request.json()) as { prompt?: unknown };
        const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

        if (!prompt) {
          streamEvent(controller, {
            type: "error",
            error: "Enter a prompt before generating a widget.",
          });
          return;
        }

        const groq = new Groq({ apiKey });
        const exampleData = await createExampleData(groq, prompt);

        streamEvent(controller, {
          type: "exampleData",
          data: exampleData,
        });

        await streamOpenUI(groq, prompt, exampleData, controller);

        streamEvent(controller, {
          type: "done",
        });
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
