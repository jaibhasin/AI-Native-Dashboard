import Groq from "groq-sdk";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ZodError, toJSONSchema } from "zod/v4";
import {
  exampleWidgetDataSchema,
  type ExampleWidgetData,
  type Tone,
} from "@/lib/dashboard-schemas";
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
  if (error instanceof ZodError) {
    return "The generated preview data was not usable. Please retry the widget.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected generation error.";
}

function mockDataSystemPrompt() {
  return [
    "You generate realistic startup operating data for a dashboard widget.",
    "The data is for UI prototyping only, not factual source data.",
    "Return data that fits the user's dashboard request.",
    "Assume the user is building a startup dashboard unless they explicitly ask for another domain.",
    "Use plausible startup metrics: ARR, MRR, burn, runway, CAC, LTV, activation, retention, churn, pipeline, conversion, usage, support, hiring, cash, and product velocity.",
    "Prefer believable ranges and units for an early-to-growth-stage software startup; avoid round-number filler like 1000, 5000, or 10% unless the context makes it natural.",
    "Make related values internally consistent: deltas should match the trend, runway should fit burn and cash, funnel counts should decrease at each stage, and percentages should stay in valid ranges.",
    "Use realistic labels such as recent months, weeks, customer segments, acquisition channels, plans, roles, regions, or product areas instead of generic labels like Item 1 or Series A.",
    "When the request is vague, choose a credible B2B SaaS startup scenario and include enough specificity to make the widget feel real.",
    "Do not use famous company names, real customer names, private facts, or claims that imply the data came from a real business.",
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

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = "") {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,%\s,]/g, ""));

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function normalizeTone(value: unknown): Tone {
  return value === "positive" || value === "negative" || value === "warning" || value === "neutral"
    ? value
    : "neutral";
}

function normalizeMetrics(value: unknown) {
  return asArray(value).map((item) => {
    const record = asRecord(item);

    return {
      label: asString(record.label ?? record.name ?? record.metric, "Metric"),
      value: asString(record.value ?? record.amount ?? record.count, "0"),
      delta: asString(record.delta ?? record.change),
      tone: normalizeTone(record.tone ?? record.status),
    };
  });
}

function normalizeInsights(value: unknown) {
  return asArray(value).map((item) => {
    const record = asRecord(item);

    return {
      label: asString(record.label ?? record.title ?? record.name, "Insight"),
      detail: asString(record.detail ?? record.description ?? record.value, ""),
      tone: normalizeTone(record.tone ?? record.status),
    };
  });
}

function normalizeTable(value: unknown) {
  const record = asRecord(value);
  const columns = asArray(record.columns).map((column) => asString(column)).filter(Boolean);
  const rows = asArray(record.rows).map((row) => {
    if (Array.isArray(row)) {
      return {
        cells: row.map((cell) => asString(cell)),
      };
    }

    const rowRecord = asRecord(row);
    const cells = Array.isArray(rowRecord.cells)
      ? rowRecord.cells.map((cell) => asString(cell))
      : columns.map((column) => asString(rowRecord[column]));

    return {
      cells,
    };
  });

  return {
    title: asString(record.title),
    columns,
    rows,
  };
}

function normalizeFormFields(value: unknown) {
  return asArray(value).map((item) => {
    const record = asRecord(item);
    const type = record.type === "number" || record.type === "date" || record.type === "select" ? record.type : "text";

    return {
      label: asString(record.label ?? record.name, "Field"),
      placeholder: asString(record.placeholder ?? record.example),
      type,
    };
  });
}

function normalizeTimeSeries(value: unknown) {
  const record = asRecord(value);
  const rawPoints = asArray(record.points ?? record.data ?? record.rows);
  const inferredSeriesLabels: string[] = [];

  const points = rawPoints.map((point, pointIndex) => {
    const pointRecord = asRecord(point);
    const label = asString(
      pointRecord.label ?? pointRecord.month ?? pointRecord.week ?? pointRecord.day ?? pointRecord.date ?? pointRecord.name,
      `Point ${pointIndex + 1}`,
    );

    if (Array.isArray(pointRecord.values)) {
      return {
        label,
        values: pointRecord.values.map(asNumber).filter((item): item is number => item !== null),
      };
    }

    const numericEntries = Object.entries(pointRecord).filter(([key, entryValue]) => {
      return (
        !["label", "month", "week", "day", "date", "name"].includes(key) &&
        asNumber(entryValue) !== null
      );
    });

    numericEntries.forEach(([key]) => {
      if (!inferredSeriesLabels.includes(key)) {
        inferredSeriesLabels.push(key);
      }
    });

    return {
      label,
      values: numericEntries.map(([, entryValue]) => asNumber(entryValue) ?? 0),
    };
  });

  const rawSeries = asArray(record.series);
  const series =
    rawSeries.length > 0
      ? rawSeries.map((item, index) => {
          const seriesRecord = asRecord(item);

          return {
            label: asString(seriesRecord.label ?? seriesRecord.name ?? item, `Series ${index + 1}`),
            tone: normalizeTone(seriesRecord.tone),
          };
        })
      : (inferredSeriesLabels.length > 0 ? inferredSeriesLabels : ["Value"]).map((label, index) => ({
          label,
          tone: normalizeTone(index === 0 ? "neutral" : undefined),
        }));

  return {
    title: asString(record.title),
    series,
    points,
    projectionStartIndex: asNumber(record.projectionStartIndex) ?? -1,
  };
}

function normalizeRecommendedVisualization(value: unknown) {
  const normalized = asString(value, "composite").toLowerCase().replace(/[\s-]+/g, "_");

  if (normalized.includes("metric") || normalized.includes("kpi")) {
    return "metrics";
  }

  if (normalized.includes("line")) {
    return "line_chart";
  }

  if (normalized.includes("bar") || normalized.includes("column")) {
    return "bar_chart";
  }

  if (normalized.includes("table") || normalized.includes("list")) {
    return "table";
  }

  if (normalized.includes("insight")) {
    return "insights";
  }

  if (normalized.includes("form")) {
    return "form";
  }

  return normalized === "metrics" ||
    normalized === "line_chart" ||
    normalized === "bar_chart" ||
    normalized === "table" ||
    normalized === "insights" ||
    normalized === "form" ||
    normalized === "composite"
    ? normalized
    : "composite";
}

function normalizeExampleData(value: unknown) {
  const record = asRecord(value);

  return {
    title: asString(record.title, "Generated widget"),
    subtitle: asString(record.subtitle),
    dataDisclosure: asString(record.dataDisclosure, "Values are AI-generated preview data."),
    recommendedVisualization: normalizeRecommendedVisualization(record.recommendedVisualization),
    metrics: normalizeMetrics(record.metrics),
    timeSeries: normalizeTimeSeries(record.timeSeries ?? record.chart),
    table: normalizeTable(record.table),
    insights: normalizeInsights(record.insights),
    formFields: normalizeFormFields(record.formFields ?? record.fields),
  };
}

function parseExampleData(content: string | null | undefined) {
  if (!content) {
    throw new Error("Groq returned no example data.");
  }

  return exampleWidgetDataSchema.parse(normalizeExampleData(JSON.parse(content)));
}

async function createStrictExampleData(groq: Groq, prompt: string) {
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

  return parseExampleData(completion.choices[0]?.message.content);
}

async function createJsonObjectExampleData(groq: Groq, prompt: string) {
  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MOCK_DATA_MODEL || DEFAULT_MOCK_DATA_MODEL,
    messages: [
      {
        role: "system",
        content: [
          mockDataSystemPrompt(),
          "Return only valid JSON matching this TypeScript shape:",
          "{ title: string, subtitle: string, dataDisclosure: string, recommendedVisualization: string, metrics: Metric[], timeSeries: { title: string, series: Series[], points: Point[], projectionStartIndex: number }, table: { title: string, columns: string[], rows: { cells: string[] }[] }, insights: Insight[], formFields: FormField[] }",
          "All keys are required. Use empty arrays and empty strings where a section is not relevant.",
        ].join("\n"),
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: {
      type: "json_object",
    },
    reasoning_effort: "low",
    temperature: 0.2,
  });

  return parseExampleData(completion.choices[0]?.message.content);
}

async function createExampleData(groq: Groq, prompt: string) {
  try {
    return await createStrictExampleData(groq, prompt);
  } catch {
    return createJsonObjectExampleData(groq, prompt);
  }
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
