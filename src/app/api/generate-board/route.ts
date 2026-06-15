import Groq from "groq-sdk";
import OpenAI from "openai";
import { z, ZodError, toJSONSchema } from "zod/v4";
import {
  aiBoardBriefSchema,
  aiBoardPlanSchema,
  type AiBoardBrief,
  type AiBoardNotePlan,
  type AiBoardPlan,
  type AiBoardWidgetPlan,
} from "@/lib/ai-board-schemas";
import type { CanvasNoteColor } from "@/lib/dashboard-schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_GROQ_BOARD_MODEL = "openai/gpt-oss-20b";
const DEFAULT_OPENAI_BOARD_MODEL = "gpt-5.5";
const GROQ_RATE_LIMIT_COOLDOWN_MS = 60_000;
const AI_WIDGET_WIDTH = 440;
const AI_WIDGET_HEIGHT = 320;
const AI_WIDGET_GAP = 36;
const AI_NOTE_WIDTH = 284;
const AI_NOTE_HEIGHT = 108;
const AI_NOTE_GAP = 18;
const AI_NOTE_TOP_GAP = 28;
const AI_CANVAS_CENTER_X = 100000;
const AI_CANVAS_CENTER_Y = 100000;
const aiProviderSchema = z.enum(["openai", "groq"]);

let groqKeyCursor = 0;
const groqKeyCooldowns = new Map<string, number>();

type AIProvider = z.infer<typeof aiProviderSchema>;
type ModelClient = Groq | OpenAI;
type ChatCompletionResult = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

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
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function resolveProvider(value: unknown): AIProvider {
  const parsed = aiProviderSchema.safeParse(value);

  return parsed.success ? parsed.data : "groq";
}

function providerDisplayName(provider: AIProvider) {
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

function getApiKeys(provider: AIProvider) {
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

function getBoardModel(provider: AIProvider) {
  if (provider === "openai") {
    return process.env.OPENAI_BOARD_MODEL || process.env.OPENAI_MODEL || DEFAULT_OPENAI_BOARD_MODEL;
  }

  return process.env.GROQ_BOARD_MODEL || process.env.GROQ_MOCK_DATA_MODEL || DEFAULT_GROQ_BOARD_MODEL;
}

function createModelClient(provider: AIProvider, apiKey: string): ModelClient {
  return provider === "openai" ? new OpenAI({ apiKey }) : new Groq({ apiKey, maxRetries: 0 });
}

async function createChatCompletion(client: ModelClient, params: Record<string, unknown>) {
  const completions = client.chat.completions as unknown as {
    create: (completionParams: Record<string, unknown>) => Promise<unknown>;
  };

  return completions.create(params);
}

function isRateLimitError(error: unknown) {
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

function wasRateLimited(error: unknown) {
  return isRateLimitError(error) || asRecord(error).rateLimited === true;
}

function chooseGroqKey(apiKeys: string[]) {
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

function coolDownGroqKey(apiKey: string) {
  groqKeyCooldowns.set(apiKey, Date.now() + GROQ_RATE_LIMIT_COOLDOWN_MS);
}

function errorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return "The generated board plan was not usable. Please retry.";
  }

  if (error instanceof SyntaxError) {
    return "The board planner returned invalid JSON. Please retry.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected board generation error.";
}

function fallbackBoardName(brief: AiBoardBrief) {
  const source = brief.audience || brief.purpose;
  const words = source
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .join(" ");

  return words ? `${words} Board`.slice(0, 48) : "AI Whiteboard";
}

function fallbackWidgetPrompt(brief: AiBoardBrief, index: number) {
  const context = [
    brief.purpose,
    brief.audience ? `Audience: ${brief.audience}` : "",
    brief.tasks ? `Tasks: ${brief.tasks}` : "",
    brief.metrics ? `Metrics: ${brief.metrics}` : "",
    brief.dataSources ? `Source context: ${brief.dataSources}` : "",
    brief.notes ? `Notes: ${brief.notes}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
  const variants = [
    `Show the executive KPI snapshot for ${context}`,
    `Show the most important trend and forecast for ${context}`,
    `Break down the key workstreams, owners, and blockers for ${context}`,
    `Summarize risks, opportunities, and recommended next actions for ${context}`,
    `Compare the most important metric segments for ${context}`,
    `Show priority tasks, status, owner, and due date for ${context}`,
    `Show data quality assumptions and gaps for ${context}`,
    `Show weekly operating rhythm and decision points for ${context}`,
  ];

  return variants[index % variants.length];
}

function withPreviewQualifier(prompt: string, brief: AiBoardBrief) {
  const compactPrompt = prompt.replace(/\s+/g, " ").trim();
  const qualifiers = [
    /dummy preview data|preview data only|generated preview data/i.test(compactPrompt)
      ? ""
      : "Use AI-generated dummy preview data only.",
    brief.dataSources && !/context only|no live access|do not claim/i.test(compactPrompt)
      ? "Treat named data sources as context only; do not claim live access."
      : "",
  ].filter(Boolean);

  if (qualifiers.length === 0) {
    return compactPrompt.slice(0, 360);
  }

  const qualifier = qualifiers.join(" ");
  const promptLimit = Math.max(24, 360 - qualifier.length - 1);
  const basePrompt = compactPrompt.slice(0, promptLimit).trim().replace(/[.?!]?$/, "");

  return `${basePrompt}. ${qualifier}`.slice(0, 360);
}

function gridPosition(index: number, count: number, width = AI_WIDGET_WIDTH, height = AI_WIDGET_HEIGHT) {
  const columns = count <= 4 ? 2 : 3;
  const rows = Math.ceil(count / columns);
  const column = index % columns;
  const row = Math.floor(index / columns);
  const totalWidth = width * columns + AI_WIDGET_GAP * (columns - 1);
  const totalHeight = height * rows + AI_WIDGET_GAP * (rows - 1);

  return {
    x: AI_CANVAS_CENTER_X - totalWidth / 2 + column * (width + AI_WIDGET_GAP),
    y: AI_CANVAS_CENTER_Y - totalHeight / 2 + row * (height + AI_WIDGET_GAP),
  };
}

function notePosition(index: number, widgetCount: number, noteCount = Math.min(3, Math.max(1, widgetCount))) {
  const totalWidth = AI_NOTE_WIDTH * noteCount + AI_NOTE_GAP * (noteCount - 1);
  const columns = widgetCount <= 4 ? 2 : 3;
  const rows = Math.ceil(widgetCount / columns);
  const totalWidgetHeight = AI_WIDGET_HEIGHT * rows + AI_WIDGET_GAP * (rows - 1);

  return {
    x: AI_CANVAS_CENTER_X - totalWidth / 2 + index * (AI_NOTE_WIDTH + AI_NOTE_GAP),
    y: AI_CANVAS_CENTER_Y - totalWidgetHeight / 2 - AI_NOTE_HEIGHT - AI_NOTE_TOP_GAP,
  };
}

function normalizeWidgetPlan(value: unknown, index: number, count: number, brief: AiBoardBrief): AiBoardWidgetPlan {
  const record = asRecord(value);
  const fallbackPosition = gridPosition(index, count);
  const prompt = withPreviewQualifier(
    asString(record.prompt || record.title || record.name, fallbackWidgetPrompt(brief, index)),
    brief,
  );
  const width = clamp(Math.round(asNumber(record.width, AI_WIDGET_WIDTH)), 360, 560);
  const height = clamp(Math.round(asNumber(record.height, AI_WIDGET_HEIGHT)), 260, 420);

  return {
    prompt,
    x: Math.round(asNumber(record.x, fallbackPosition.x)),
    y: Math.round(asNumber(record.y, fallbackPosition.y)),
    width,
    height,
  };
}

function normalizeNotePlan(value: unknown, index: number, widgetCount: number): AiBoardNotePlan {
  const record = asRecord(value);
  const position = notePosition(index, widgetCount);
  const color = asString(record.color, "blue");
  const parsedColor = z
    .enum(["blue", "green", "amber", "rose"])
    .safeParse(color).success
    ? (color as CanvasNoteColor)
    : "blue";

  return {
    title: asString(record.title, index === 0 ? "Plan" : "Note").slice(0, 48),
    body: asString(record.body || record.detail, "").slice(0, 280),
    color: parsedColor,
    x: Math.round(asNumber(record.x, position.x)),
    y: Math.round(asNumber(record.y, position.y)),
    width: clamp(Math.round(asNumber(record.width, AI_NOTE_WIDTH)), 220, 440),
    height: clamp(Math.round(asNumber(record.height, AI_NOTE_HEIGHT)), 108, 320),
  };
}

function organizeLayout(widgets: AiBoardWidgetPlan[], notes: AiBoardNotePlan[]) {
  const columns = widgets.length <= 4 ? 2 : 3;
  const rows = Math.ceil(widgets.length / columns);
  const columnWidth = Math.max(...widgets.map((widget) => widget.width), AI_WIDGET_WIDTH);
  const rowHeights = Array.from({ length: rows }, (_, row) =>
    Math.max(
      ...widgets
        .slice(row * columns, row * columns + columns)
        .map((widget) => widget.height),
      AI_WIDGET_HEIGHT,
    ),
  );
  const totalWidth = columnWidth * columns + AI_WIDGET_GAP * (columns - 1);
  const totalHeight = rowHeights.reduce((sum, height) => sum + height, 0) + AI_WIDGET_GAP * Math.max(0, rows - 1);
  const left = AI_CANVAS_CENTER_X - totalWidth / 2;
  const top = AI_CANVAS_CENTER_Y - totalHeight / 2;
  const rowTopOffsets = rowHeights.map((_, row) =>
    rowHeights.slice(0, row).reduce((sum, height) => sum + height, 0) + row * AI_WIDGET_GAP,
  );
  const positionedWidgets = widgets.map((widget, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);

    return {
      ...widget,
      x: Math.round(left + column * (columnWidth + AI_WIDGET_GAP) + (columnWidth - widget.width) / 2),
      y: Math.round(top + rowTopOffsets[row]),
    };
  });
  const noteCount = notes.length;
  const noteColumnWidth = Math.max(...notes.map((note) => note.width), AI_NOTE_WIDTH);
  const noteHeight = Math.max(...notes.map((note) => note.height), AI_NOTE_HEIGHT);
  const noteTotalWidth = noteColumnWidth * noteCount + AI_NOTE_GAP * Math.max(0, noteCount - 1);
  const noteLeft = AI_CANVAS_CENTER_X - noteTotalWidth / 2;
  const noteTop = top - noteHeight - AI_NOTE_TOP_GAP;
  const positionedNotes = notes.map((note, index) => ({
    ...note,
    x: Math.round(noteLeft + index * (noteColumnWidth + AI_NOTE_GAP) + (noteColumnWidth - note.width) / 2),
    y: Math.round(noteTop),
  }));

  return {
    notes: positionedNotes,
    widgets: positionedWidgets,
  };
}

function normalizeBoardPlan(value: unknown, brief: AiBoardBrief): AiBoardPlan {
  const record = asRecord(value);
  const rawWidgets = asArray(record.widgets).slice(0, 8);
  const targetWidgetCount = clamp(rawWidgets.length || 6, 4, 8);
  const widgets = Array.from({ length: targetWidgetCount }, (_, index) =>
    normalizeWidgetPlan(rawWidgets[index], index, targetWidgetCount, brief),
  );
  const rawNotes = asArray(record.notes).slice(0, 3);
  const notes = rawNotes
    .map((note, index) => normalizeNotePlan(note, index, widgets.length))
    .filter((note) => note.title.trim() || note.body.trim());
  const organizedLayout = organizeLayout(widgets, notes);

  return aiBoardPlanSchema.parse({
    boardName: asString(record.boardName || record.name || record.title, fallbackBoardName(brief)).slice(0, 48),
    notes: organizedLayout.notes,
    widgets: organizedLayout.widgets,
  });
}

function boardPlanSystemPrompt() {
  return [
    "You plan editable AI whiteboards for operating teams.",
    "Return one complete board plan with useful widgets and optional notes.",
    "The app does not connect to live systems in this version.",
    "Treat data sources like docs, GitHub, email, CRM, spreadsheets, and logs as user-provided context only.",
    "Never claim that data was fetched, synced, connected, read, imported, or verified.",
    "Every widget prompt must be clear that the widget should use AI-generated dummy preview data only.",
    "Choose 4 to 8 non-duplicative widgets that cover the purpose, audience, tasks, metrics, data-source context, and additional notes.",
    "Prefer a balanced board: KPI snapshot, trend/forecast, breakdown table, task/status view, risks/insights, and decision/action view when relevant.",
    "Write widget prompts that are specific enough for a second AI call to generate the widget.",
    "Place widgets in a clean non-overlapping grid around x=100000 and y=100000.",
    "Use width 440 and height 320 for most widgets; use height up to 380 only when table or insight content needs room.",
    "Use up to 3 notes above the widget grid for goals, assumptions, source-context caveats, or priorities.",
    "Keep boardName short, concrete, and readable in a tab.",
  ].join("\n");
}

function boardPlanUserPrompt(brief: AiBoardBrief) {
  return [
    `Purpose: ${brief.purpose}`,
    `Team or audience: ${brief.audience || "Not specified"}`,
    `Important tasks: ${brief.tasks || "Not specified"}`,
    `Important metrics: ${brief.metrics || "Not specified"}`,
    `Data sources named by user: ${brief.dataSources || "Not specified"}`,
    `Additional notes: ${brief.notes || "Not specified"}`,
  ].join("\n");
}

function parseBoardPlan(content: string | null | undefined, provider: AIProvider, brief: AiBoardBrief) {
  if (!content) {
    throw new Error(`${providerDisplayName(provider)} returned no board plan.`);
  }

  return normalizeBoardPlan(JSON.parse(content), brief);
}

async function createStrictBoardPlan(client: ModelClient, provider: AIProvider, brief: AiBoardBrief) {
  const completion = (await createChatCompletion(client, {
    model: getBoardModel(provider),
    messages: [
      {
        role: "system",
        content: boardPlanSystemPrompt(),
      },
      {
        role: "user",
        content: boardPlanUserPrompt(brief),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "ai_board_plan",
        strict: true,
        schema: toJSONSchema(aiBoardPlanSchema),
      },
    },
    reasoning_effort: "low",
    ...(provider === "groq" ? { temperature: 0.2 } : {}),
  })) as ChatCompletionResult;

  return parseBoardPlan(completion.choices?.[0]?.message?.content, provider, brief);
}

async function createJsonObjectBoardPlan(client: ModelClient, provider: AIProvider, brief: AiBoardBrief) {
  const completion = (await createChatCompletion(client, {
    model: getBoardModel(provider),
    messages: [
      {
        role: "system",
        content: [
          boardPlanSystemPrompt(),
          "Return only valid JSON matching this TypeScript shape:",
          "{ boardName: string, widgets: { prompt: string, x: number, y: number, width: number, height: number }[], notes: { title: string, body: string, color: 'blue' | 'green' | 'amber' | 'rose', x: number, y: number, width: number, height: number }[] }",
        ].join("\n"),
      },
      {
        role: "user",
        content: boardPlanUserPrompt(brief),
      },
    ],
    response_format: {
      type: "json_object",
    },
    reasoning_effort: "low",
    ...(provider === "groq" ? { temperature: 0.2 } : {}),
  })) as ChatCompletionResult;

  return parseBoardPlan(completion.choices?.[0]?.message?.content, provider, brief);
}

async function createBoardPlan(client: ModelClient, provider: AIProvider, brief: AiBoardBrief) {
  try {
    return await createStrictBoardPlan(client, provider, brief);
  } catch (error) {
    if (isRateLimitError(error)) {
      throw error;
    }

    return createJsonObjectBoardPlan(client, provider, brief);
  }
}

async function createBoardPlanWithGroqFailover(apiKeys: string[], brief: AiBoardBrief) {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < apiKeys.length; attempt += 1) {
    const selected = chooseGroqKey(apiKeys);

    if (!selected) {
      break;
    }

    try {
      return await createBoardPlan(createModelClient("groq", selected.apiKey), "groq", brief);
    } catch (error) {
      lastError = error;

      if (wasRateLimited(error)) {
        coolDownGroqKey(selected.apiKey);
      }
    }
  }

  if (lastError && wasRateLimited(lastError)) {
    throw new Error("All configured Groq API keys are currently rate limited. Wait a minute, then retry.");
  }

  if (lastError) {
    throw new Error(`All configured Groq API keys failed while planning the board. Last error: ${errorMessage(lastError)}`);
  }

  throw new Error("All configured Groq API keys are cooling down. Wait a minute, then retry.");
}

export async function POST(request: Request) {
  try {
    const brief = aiBoardBriefSchema.parse(await request.json());
    const provider = resolveProvider(process.env.AI_PROVIDER);
    const apiKeys = getApiKeys(provider);

    if (apiKeys.length === 0) {
      return Response.json(
        {
          error: `Missing ${provider === "openai" ? "OPENAI_API_KEY" : "GROQ_API_KEY or GROQ_API_KEYS"}. Add it to your environment and retry.`,
        },
        { status: 500 },
      );
    }

    const plan =
      provider === "groq"
        ? await createBoardPlanWithGroqFailover(apiKeys, brief)
        : await createBoardPlan(createModelClient(provider, apiKeys[0]), provider, brief);

    return Response.json(plan);
  } catch (error) {
    const status = error instanceof ZodError ? 400 : 500;

    return Response.json(
      {
        error: errorMessage(error),
      },
      { status },
    );
  }
}
