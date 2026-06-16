import type { AiBoardBrief, AiBoardNotePlan, AiBoardPlan, AiBoardWidgetPlan } from "./ai-board-schemas";

const FALLBACK_WIDGET_WIDTH = 440;
const FALLBACK_WIDGET_HEIGHT = 320;
const FALLBACK_WIDGET_GAP = 36;
const FALLBACK_NOTE_WIDTH = 284;
const FALLBACK_NOTE_HEIGHT = 108;
const FALLBACK_NOTE_GAP = 18;
const FALLBACK_NOTE_TOP_GAP = 28;
const FALLBACK_CANVAS_CENTER_X = 100000;
const FALLBACK_CANVAS_CENTER_Y = 100000;
const PROMPT_LIMIT = 360;

function compact(value: string, fallback: string) {
  const nextValue = value.replace(/\s+/g, " ").trim();

  return nextValue || fallback;
}

function clipped(value: string, limit: number) {
  const nextValue = value.replace(/\s+/g, " ").trim();

  if (nextValue.length <= limit) {
    return nextValue;
  }

  return nextValue.slice(0, limit - 1).trimEnd();
}

function boardNameFromBrief(brief: AiBoardBrief) {
  const source = compact(brief.audience || brief.purpose, "AI Whiteboard");
  const words = source
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .join(" ");

  return words ? `${words} Board`.slice(0, 48) : "AI Whiteboard";
}

function promptWithPreviewQualifier(prompt: string, brief: AiBoardBrief) {
  const qualifiers = [
    "Use AI-generated dummy preview data only.",
    brief.dataSources ? "Treat named data sources as context only; do not claim live access." : "",
  ].filter(Boolean);
  const qualifier = qualifiers.join(" ");
  const promptLimit = Math.max(24, PROMPT_LIMIT - qualifier.length - 1);
  const basePrompt = clipped(prompt, promptLimit).replace(/[.?!]?$/, "");

  return `${basePrompt}. ${qualifier}`.slice(0, PROMPT_LIMIT);
}

function widgetPosition(index: number, count: number) {
  const columns = count <= 4 ? 2 : 3;
  const rows = Math.ceil(count / columns);
  const column = index % columns;
  const row = Math.floor(index / columns);
  const totalWidth = FALLBACK_WIDGET_WIDTH * columns + FALLBACK_WIDGET_GAP * (columns - 1);
  const totalHeight = FALLBACK_WIDGET_HEIGHT * rows + FALLBACK_WIDGET_GAP * (rows - 1);

  return {
    x: Math.round(FALLBACK_CANVAS_CENTER_X - totalWidth / 2 + column * (FALLBACK_WIDGET_WIDTH + FALLBACK_WIDGET_GAP)),
    y: Math.round(FALLBACK_CANVAS_CENTER_Y - totalHeight / 2 + row * (FALLBACK_WIDGET_HEIGHT + FALLBACK_WIDGET_GAP)),
  };
}

function notePosition(index: number, count: number, widgetCount: number) {
  const columns = widgetCount <= 4 ? 2 : 3;
  const rows = Math.ceil(widgetCount / columns);
  const totalWidgetHeight = FALLBACK_WIDGET_HEIGHT * rows + FALLBACK_WIDGET_GAP * (rows - 1);
  const totalNoteWidth = FALLBACK_NOTE_WIDTH * count + FALLBACK_NOTE_GAP * Math.max(0, count - 1);

  return {
    x: Math.round(FALLBACK_CANVAS_CENTER_X - totalNoteWidth / 2 + index * (FALLBACK_NOTE_WIDTH + FALLBACK_NOTE_GAP)),
    y: Math.round(FALLBACK_CANVAS_CENTER_Y - totalWidgetHeight / 2 - FALLBACK_NOTE_HEIGHT - FALLBACK_NOTE_TOP_GAP),
  };
}

function fallbackWidgets(brief: AiBoardBrief): AiBoardWidgetPlan[] {
  const purpose = compact(brief.purpose, "this operating review");
  const audience = compact(brief.audience, "the team");
  const tasks = compact(brief.tasks, "priority workstreams, owners, status, and blockers");
  const metrics = compact(brief.metrics, "the most important operating metrics");
  const dataSources = compact(brief.dataSources, "available source context");
  const notes = compact(brief.notes, "the brief context");
  const prompts = [
    `Show an executive KPI snapshot for ${purpose} covering ${metrics}`,
    `Show the most important trend and forecast for ${purpose} using ${metrics}`,
    `Show a status table for ${tasks}`,
    `Summarize risks, blockers, opportunities, and recommendations for ${purpose}`,
    `Compare the important segments, sources, or workstreams for ${audience} using ${dataSources}`,
    `Show recommended decisions, next actions, owners, and due dates for ${audience} based on ${notes}`,
  ];

  return prompts.map((prompt, index) => ({
    ...widgetPosition(index, prompts.length),
    height: FALLBACK_WIDGET_HEIGHT,
    prompt: promptWithPreviewQualifier(prompt, brief),
    width: FALLBACK_WIDGET_WIDTH,
  }));
}

function fallbackNotes(brief: AiBoardBrief, widgetCount: number): AiBoardNotePlan[] {
  const notes = [
    {
      body: clipped(brief.purpose, 180),
      color: "blue" as const,
      title: "Board goal",
    },
    {
      body: brief.metrics
        ? clipped(`Track ${brief.metrics}.`, 180)
        : "Focus the review on the few metrics that change decisions.",
      color: "green" as const,
      title: "Metrics",
    },
    {
      body: brief.dataSources
        ? clipped("Named data sources are context only; widgets use preview data.", 180)
        : "Widgets use AI-generated preview data, not live source data.",
      color: "amber" as const,
      title: "Preview data",
    },
  ].filter((note) => note.body.trim());

  return notes.slice(0, 3).map((note, index, currentNotes) => ({
    ...notePosition(index, currentNotes.length, widgetCount),
    ...note,
    height: FALLBACK_NOTE_HEIGHT,
    width: FALLBACK_NOTE_WIDTH,
  }));
}

export function fallbackAiBoardPlan(brief: AiBoardBrief): AiBoardPlan {
  const widgets = fallbackWidgets(brief);

  return {
    boardName: boardNameFromBrief(brief),
    notes: fallbackNotes(brief, widgets.length),
    widgets,
  };
}
