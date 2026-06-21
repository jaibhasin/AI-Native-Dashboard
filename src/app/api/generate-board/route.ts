import { z, ZodError, toJSONSchema } from "zod/v4";
import {
  aiBoardBriefSchema,
  aiBoardPlanSchema,
  type AiBoardBrief,
  type AiBoardNotePlan,
  type AiBoardPlan,
  type AiBoardWidgetPlan,
} from "@/lib/ai-board-schemas";
import { fallbackAiBoardPlan, fallbackWidgetExampleData } from "@/lib/ai-board-fallback";
import { exampleWidgetDataSchema, type CanvasNoteColor, type ExampleWidgetData } from "@/lib/dashboard-schemas";
import {
  chooseGroqKey,
  coolDownGroqKey,
  createChatCompletion,
  createModelClient,
  getApiKeys,
  isRateLimitError,
  providerDisplayName,
  requireOpenRouterModel,
  resolveProvider,
  wasRateLimited,
  type ChatCompletionResult,
  type ModelClient,
} from "../generate-widget/provider";
import type { AIProvider } from "../generate-widget/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_GROQ_BOARD_MODEL = "openai/gpt-oss-20b";
const AI_WIDGET_WIDTH = 440;
const AI_WIDGET_HEIGHT = 320;
const AI_WIDGET_GAP = 36;
const AI_NOTE_WIDTH = 284;
const AI_NOTE_HEIGHT = 108;
const AI_NOTE_GAP = 18;
const AI_NOTE_TOP_GAP = 28;
const AI_CANVAS_CENTER_X = 100000;
const AI_CANVAS_CENTER_Y = 100000;

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

function gridColumns(count: number) {
  if (count <= 4) {
    return 2;
  }

  if (count <= 6) {
    return 3;
  }

  return 4;
}

function getBoardModel(provider: AIProvider) {
  if (provider === "openrouter") {
    return requireOpenRouterModel("OPENROUTER_BOARD_MODEL");
  }

  return process.env.GROQ_BOARD_MODEL || process.env.GROQ_MOCK_DATA_MODEL || DEFAULT_GROQ_BOARD_MODEL;
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

function parseJsonObject(content: string) {
  const trimmedContent = content.trim();
  const unfencedContent = trimmedContent
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(unfencedContent);
  } catch (error) {
    const start = unfencedContent.indexOf("{");
    const end = unfencedContent.lastIndexOf("}");

    if (start === -1 || end <= start) {
      throw error;
    }

    return JSON.parse(unfencedContent.slice(start, end + 1));
  }
}

function modelTuningParams(provider: AIProvider) {
  return provider === "groq" ? { temperature: 0.2 } : {};
}

function fallbackBoardResponse(brief: AiBoardBrief, reason: string, error?: unknown) {
  if (error) {
    console.warn(`AI board planner failed; using fallback plan (${reason}).`, error);
  }

  return Response.json(fallbackAiBoardPlan(brief), {
    headers: {
      "X-AI-Board-Fallback": reason,
    },
  });
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
    `Show a forecast and projection view for ${context}`,
    `Break down the key workstreams, owners, and blockers for ${context}`,
    `Summarize risks, opportunities, and recommended next actions for ${context}`,
    `Compare the most important metric segments for ${context}`,
    `Show priority tasks, status, owner, and due date for ${context}`,
    `Show a leaderboard or ranking of top contributors or accounts for ${context}`,
    `Show a conversion funnel or activation drop-off view for ${context}`,
    `Show gauge-style value-vs-target metrics for ${context}`,
    `Show milestone and readiness timeline for ${context}`,
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
  const columns = gridColumns(count);
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

function notePosition(index: number, widgetCount: number, noteCount = Math.min(6, Math.max(1, widgetCount))) {
  const totalWidth = AI_NOTE_WIDTH * noteCount + AI_NOTE_GAP * (noteCount - 1);
  const columns = gridColumns(widgetCount);
  const rows = Math.ceil(widgetCount / columns);
  const totalWidgetHeight = AI_WIDGET_HEIGHT * rows + AI_WIDGET_GAP * (rows - 1);

  return {
    x: AI_CANVAS_CENTER_X - totalWidth / 2 + index * (AI_NOTE_WIDTH + AI_NOTE_GAP),
    y: AI_CANVAS_CENTER_Y - totalWidgetHeight / 2 - AI_NOTE_HEIGHT - AI_NOTE_TOP_GAP,
  };
}

function normalizeWidgetExampleData(value: unknown, prompt: string, index: number): ExampleWidgetData {
  const parsed = exampleWidgetDataSchema.safeParse(value);

  return parsed.success ? parsed.data : fallbackWidgetExampleData(prompt, index);
}

function normalizeWidgetPlan(value: unknown, index: number, count: number, brief: AiBoardBrief): AiBoardWidgetPlan {
  const record = asRecord(value);
  const fallbackPosition = gridPosition(index, count);
  const prompt = withPreviewQualifier(
    asString(record.prompt || record.title || record.name, fallbackWidgetPrompt(brief, index)),
    brief,
  );
  const exampleData = normalizeWidgetExampleData(record.exampleData ?? record.data, prompt, index);
  const width = clamp(Math.round(asNumber(record.width, AI_WIDGET_WIDTH)), 360, 560);
  const height = clamp(Math.round(asNumber(record.height, AI_WIDGET_HEIGHT)), 260, 420);

  return {
    exampleData,
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
  const columns = gridColumns(widgets.length);
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

function defaultNotePlans(brief: AiBoardBrief, widgetCount: number): AiBoardNotePlan[] {
  const defaults = [
    {
      body: brief.purpose.slice(0, 180),
      color: "blue" as CanvasNoteColor,
      title: "Board goal",
    },
    {
      body: brief.metrics
        ? `Track ${brief.metrics}.`.slice(0, 180)
        : "Focus the review on the few metrics that change decisions.",
      color: "green" as CanvasNoteColor,
      title: "Metrics",
    },
    {
      body: brief.dataSources
        ? "Named data sources are context only; widgets use preview data.".slice(0, 180)
        : "Widgets use AI-generated preview data, not live source data.",
      color: "amber" as CanvasNoteColor,
      title: "Preview data",
    },
    {
      body: brief.tasks
        ? `Prioritize ${brief.tasks}.`.slice(0, 180)
        : "Focus on the highest-impact workstreams and owners.",
      color: "rose" as CanvasNoteColor,
      title: "Priorities",
    },
  ];

  return defaults.map((note, index) => ({
    ...notePosition(index, widgetCount, defaults.length),
    ...note,
    height: AI_NOTE_HEIGHT,
    width: AI_NOTE_WIDTH,
  }));
}

function padNotesWithDefaults(notes: AiBoardNotePlan[], brief: AiBoardBrief, widgetCount: number) {
  const minimumNotes = 4;
  const paddedNotes = [...notes];

  if (paddedNotes.length >= minimumNotes) {
    return paddedNotes.slice(0, 6);
  }

  const defaults = defaultNotePlans(brief, widgetCount);

  for (const defaultNote of defaults) {
    if (paddedNotes.length >= minimumNotes) {
      break;
    }

    const isDuplicate = paddedNotes.some(
      (note) => note.title === defaultNote.title || note.body === defaultNote.body,
    );

    if (!isDuplicate) {
      paddedNotes.push(defaultNote);
    }
  }

  return paddedNotes.slice(0, 6);
}

function normalizeBoardPlan(value: unknown, brief: AiBoardBrief): AiBoardPlan {
  const record = asRecord(value);
  const rawWidgets = asArray(record.widgets).slice(0, 12);
  const targetWidgetCount = clamp(rawWidgets.length || 11, 10, 12);
  const widgets = Array.from({ length: targetWidgetCount }, (_, index) =>
    normalizeWidgetPlan(rawWidgets[index], index, targetWidgetCount, brief),
  );
  const rawNotes = asArray(record.notes).slice(0, 6);
  const notes = padNotesWithDefaults(
    rawNotes
      .map((note, index) => normalizeNotePlan(note, index, widgets.length))
      .filter((note) => note.title.trim() || note.body.trim()),
    brief,
    widgets.length,
  );
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
    "Also include exampleData for every widget in this same response so downstream widget rendering can reuse one planned data layer.",
    "Each exampleData object must match its widget prompt and include realistic metrics, chart/table data, funnel/gauge/ranking/milestone fields, insights, or form fields as needed.",
    "Vary recommendedVisualization across widgets: prefer stat, funnel, gauge, ranking, timeline, metrics, line_chart, bar_chart, table, insights, form, or composite as appropriate.",
    "Use funnel for conversion views, gauge for value-vs-target, ranking for leaderboards, timeline for milestones/readiness, and stat for single headline KPIs.",
    "Choose 10 to 12 non-duplicative widgets that cover the purpose, audience, tasks, metrics, data-source context, and additional notes.",
    "Prefer a balanced full board: KPI snapshot, trend, forecast, breakdown table, ranking/leaderboard, funnel, gauges, milestone/timeline, task/status view, segment comparison, risks/insights, decision/action view, and data-quality view when relevant.",
    "Write widget prompts that are specific enough for a second AI call to generate the widget.",
    "Place widgets in a clean non-overlapping grid around x=100000 and y=100000.",
    "Use width 440 and height 320 for most widgets; use height up to 380 only when table or insight content needs room.",
    "Use 4 to 6 notes above the widget grid for goals, assumptions, source-context caveats, priorities, and risks.",
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

  return normalizeBoardPlan(parseJsonObject(content), brief);
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
    ...modelTuningParams(provider),
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
          "{ boardName: string, widgets: { prompt: string, exampleData: { title: string, subtitle: string, dataDisclosure: string, recommendedVisualization: 'stat' | 'funnel' | 'gauge' | 'ranking' | 'timeline' | 'metrics' | 'line_chart' | 'bar_chart' | 'table' | 'insights' | 'form' | 'composite', metrics: { label: string, value: string, delta: string, tone: 'neutral' | 'positive' | 'negative' | 'warning' }[], timeSeries: { title: string, series: { label: string, tone: 'neutral' | 'positive' | 'negative' | 'warning' }[], points: { label: string, values: number[] }[], projectionStartIndex: number }, table: { title: string, columns: string[], rows: { cells: string[] }[] }, insights: { label: string, detail: string, tone: 'neutral' | 'positive' | 'negative' | 'warning' }[], formFields: { label: string, type: 'text' | 'number' | 'date' | 'select', placeholder: string }[], funnel: { title: string, steps: { label: string, value: number, dropoff: string, tone: 'neutral' | 'positive' | 'negative' | 'warning' }[] }, gauges: { label: string, value: number, target: number, unit: string, tone: 'neutral' | 'positive' | 'negative' | 'warning' }[], ranking: { title: string, items: { label: string, value: string, detail: string, badge: string, tone: 'neutral' | 'positive' | 'negative' | 'warning' }[] }, milestones: { title: string, items: { label: string, detail: string, status: 'done' | 'active' | 'blocked' | 'todo' }[] } }, x: number, y: number, width: number, height: number }[], notes: { title: string, body: string, color: 'blue' | 'green' | 'amber' | 'rose', x: number, y: number, width: number, height: number }[] }",
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
    ...modelTuningParams(provider),
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

async function createBoardPlanWithGroqPrimary(brief: AiBoardBrief) {
  const groqApiKeys = getApiKeys("groq");

  if (groqApiKeys.length === 0) {
    throw new Error("Missing GROQ_API_KEY or GROQ_API_KEYS.");
  }

  try {
    return await createBoardPlanWithGroqFailover(groqApiKeys, brief);
  } catch (groqError) {
    const openRouterApiKeys = getApiKeys("openrouter");

    if (openRouterApiKeys.length === 0) {
      throw groqError;
    }

    try {
      return await createBoardPlan(createModelClient("openrouter", openRouterApiKeys[0]), "openrouter", brief);
    } catch (openRouterError) {
      throw new Error(`Groq board planning failed, and OpenRouter backup also failed. OpenRouter error: ${errorMessage(openRouterError)}. Groq error: ${errorMessage(groqError)}`);
    }
  }
}

const BRIEF_REFINEMENT_PURPOSE_THRESHOLD = 40;

function briefNeedsRefinement(brief: AiBoardBrief) {
  const optionalFields = [brief.audience, brief.tasks, brief.metrics, brief.dataSources];
  const filledOptionalCount = optionalFields.filter((value) => value.trim().length > 0).length;

  return brief.purpose.trim().length < BRIEF_REFINEMENT_PURPOSE_THRESHOLD || filledOptionalCount <= 1;
}

function refineBriefSystemPrompt() {
  return [
    "You expand sparse operating briefs into complete whiteboard planning inputs.",
    "Infer realistic audience, tasks, metrics, data sources, and notes that fit the stated purpose.",
    "Treat data sources as user-provided context only; never claim live access, sync, or verification.",
    "Keep the user's intent and domain; do not invent unrelated goals.",
    "Return only valid JSON matching the brief shape with all six fields populated.",
    "If a field already has user content, keep its meaning but you may clarify wording slightly.",
  ].join("\n");
}

function refineBriefUserPrompt(brief: AiBoardBrief) {
  return [
    "Expand this brief into a complete operating brief for dashboard planning.",
    `Purpose: ${brief.purpose}`,
    `Team or audience: ${brief.audience || "Not specified"}`,
    `Important tasks: ${brief.tasks || "Not specified"}`,
    `Important metrics: ${brief.metrics || "Not specified"}`,
    `Data sources named by user: ${brief.dataSources || "Not specified"}`,
    `Additional notes: ${brief.notes || "Not specified"}`,
  ].join("\n");
}

function mergeRefinedBrief(original: AiBoardBrief, refined: AiBoardBrief): AiBoardBrief {
  const pickField = (field: keyof AiBoardBrief) => {
    const originalValue = original[field].trim();
    const refinedValue = refined[field].trim();

    if (originalValue) {
      return originalValue;
    }

    return refinedValue;
  };

  const purpose = original.purpose.trim() || refined.purpose.trim();

  return aiBoardBriefSchema.parse({
    audience: pickField("audience"),
    dataSources: pickField("dataSources"),
    metrics: pickField("metrics"),
    notes: pickField("notes"),
    purpose: purpose || refined.purpose.trim(),
    tasks: pickField("tasks"),
  });
}

async function createRefinedBrief(client: ModelClient, provider: AIProvider, brief: AiBoardBrief) {
  const completion = (await createChatCompletion(client, {
    model: getBoardModel(provider),
    messages: [
      {
        role: "system",
        content: refineBriefSystemPrompt(),
      },
      {
        role: "user",
        content: refineBriefUserPrompt(brief),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "ai_board_brief",
        strict: true,
        schema: toJSONSchema(aiBoardBriefSchema),
      },
    },
    ...modelTuningParams(provider),
  })) as ChatCompletionResult;

  const content = completion.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error(`${providerDisplayName(provider)} returned no refined brief.`);
  }

  const refined = aiBoardBriefSchema.parse(parseJsonObject(content));

  return mergeRefinedBrief(brief, refined);
}

async function refineBriefSafely(provider: AIProvider, apiKeys: string[], brief: AiBoardBrief) {
  if (!briefNeedsRefinement(brief) || apiKeys.length === 0) {
    return brief;
  }

  try {
    if (provider === "groq") {
      const selected = chooseGroqKey(apiKeys);

      if (!selected) {
        return brief;
      }

      return await createRefinedBrief(createModelClient("groq", selected.apiKey), "groq", brief);
    }

    return await createRefinedBrief(createModelClient(provider, apiKeys[0]), provider, brief);
  } catch (error) {
    console.warn("AI brief refinement failed; using original brief.", error);
    return brief;
  }
}

async function refineBriefWithGroqPrimary(brief: AiBoardBrief) {
  if (!briefNeedsRefinement(brief)) {
    return brief;
  }

  const groqApiKeys = getApiKeys("groq");
  const selected = groqApiKeys.length > 0 ? chooseGroqKey(groqApiKeys) : null;

  try {
    if (selected) {
      return await createRefinedBrief(createModelClient("groq", selected.apiKey), "groq", brief);
    }
  } catch (error) {
    if (wasRateLimited(error) && selected) {
      coolDownGroqKey(selected.apiKey);
    }

    console.warn("Groq brief refinement failed; trying OpenRouter backup.", error);
  }

  const openRouterApiKeys = getApiKeys("openrouter");

  if (openRouterApiKeys.length === 0) {
    return brief;
  }

  try {
    return await createRefinedBrief(createModelClient("openrouter", openRouterApiKeys[0]), "openrouter", brief);
  } catch (error) {
    console.warn("OpenRouter brief refinement failed; using original brief.", error);
    return brief;
  }
}

export async function POST(request: Request) {
  let brief: AiBoardBrief;

  try {
    brief = aiBoardBriefSchema.parse(await request.json());
  } catch (error) {
    return Response.json(
      {
        error: error instanceof ZodError ? "Describe what this whiteboard is for." : "The request body was not valid JSON.",
      },
      { status: 400 },
    );
  }

  try {
    const provider = resolveProvider(process.env.AI_PROVIDER);

    if (provider === "openrouter") {
      const apiKeys = getApiKeys(provider);

      if (apiKeys.length === 0) {
        return fallbackBoardResponse(brief, "missing-api-key");
      }

      const planBrief = await refineBriefSafely(provider, apiKeys, brief);
      const plan = await createBoardPlan(createModelClient(provider, apiKeys[0]), provider, planBrief);

      return Response.json(plan);
    }

    const planBrief = await refineBriefWithGroqPrimary(brief);
    const plan = await createBoardPlanWithGroqPrimary(planBrief);

    return Response.json(plan);
  } catch (error) {
    return fallbackBoardResponse(brief, "planner-error", error);
  }
}
