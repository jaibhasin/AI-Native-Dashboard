import type { AiBoardBrief, AiBoardNotePlan, AiBoardPlan, AiBoardWidgetPlan } from "./ai-board-schemas";
import type { ExampleWidgetData, Tone } from "./dashboard-schemas";

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

function titleFromPrompt(prompt: string, index: number) {
  const cleaned = prompt
    .replace(/\buse ai-generated dummy preview data only\b.*$/i, "")
    .replace(/\btreat named data sources as context only\b.*$/i, "")
    .replace(/^(show|create|generate|provide|summarize)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+(for|using|covering|based on)\s+/i)[0];
  const clippedTitle = clipped(cleaned, 42);

  if (!clippedTitle) {
    return `Board View ${index + 1}`;
  }

  return clippedTitle.replace(/\b[a-z]/g, (character) => character.toUpperCase());
}

function fallbackVisualization(prompt: string): ExampleWidgetData["recommendedVisualization"] {
  if (/\b(form|input|intake|planner|calculator|scenario)\b/i.test(prompt)) {
    return "form";
  }

  if (/\b(funnel|activation|conversion|drop[- ]?off|signup)\b/i.test(prompt)) {
    return "funnel";
  }

  if (/\b(gauge|utilization|vs target|margin goal|efficiency)\b/i.test(prompt)) {
    return "gauge";
  }

  if (/\b(top|leaderboard|rank|concentration|accounts by)\b/i.test(prompt)) {
    return "ranking";
  }

  if (/\b(milestone|readiness|roadmap|diligence|timeline)\b/i.test(prompt)) {
    return "timeline";
  }

  if (/\b(table|status|task|owner|breakdown|list|workstream)\b/i.test(prompt)) {
    return "table";
  }

  if (/\b(risk|blocker|insight|recommend|decision|action|opportunity)\b/i.test(prompt)) {
    return "insights";
  }

  if (/\b(trend|forecast|compare|comparison|over time|chart)\b/i.test(prompt)) {
    return "line_chart";
  }

  if (/\b(runway|headline|hero|single kpi)\b/i.test(prompt)) {
    return "stat";
  }

  if (/\b(kpi|metric|snapshot|scorecard)\b/i.test(prompt)) {
    return "metrics";
  }

  return "composite";
}

function trendPoints(seed: number) {
  return ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6"].map((label, index) => ({
    label,
    values: [
      Math.max(34, 62 + seed * 2 + index * 4),
      Math.max(8, 28 + seed - index * 2),
    ],
  }));
}

function metricTone(index: number): Tone {
  return (["positive", "warning", "neutral", "negative"] as const)[index % 4];
}

export function fallbackWidgetExampleData(prompt: string, index = 0): ExampleWidgetData {
  const title = titleFromPrompt(prompt, index);
  const visualization = fallbackVisualization(prompt);
  const seed = index + 1;
  const metrics = [
    {
      label: "Progress",
      value: `${Math.min(96, 72 + seed * 3)}%`,
      delta: "+4 pts vs last review",
      tone: "positive" as const,
    },
    {
      label: "Open items",
      value: `${Math.max(5, 21 - seed * 2)}`,
      delta: "-3 this week",
      tone: "positive" as const,
    },
    {
      label: "At risk",
      value: `${Math.max(1, 5 + (seed % 3))}`,
      delta: "Needs owner review",
      tone: "warning" as const,
    },
    {
      label: "Decision age",
      value: `${2 + (seed % 4)}d`,
      delta: "Target under 3d",
      tone: metricTone(seed),
    },
  ];
  const timeSeries = {
    title: "Operating Trend",
    series: [
      { label: "Completed", tone: "positive" as const },
      { label: "Blocked", tone: "warning" as const },
    ],
    points: trendPoints(seed),
    projectionStartIndex: visualization === "line_chart" ? 4 : -1,
  };
  const table = {
    title: "Priority Workstreams",
    columns: ["Area", "Owner", "Status", "Next step"],
    rows: [
      { cells: ["Core workflow", "Avery", "On track", "Review progress"] },
      { cells: ["Data quality", "Mina", "Watch", "Resolve gaps"] },
      { cells: ["Stakeholder follow-up", "Dev", "Blocked", "Confirm owner"] },
      { cells: ["Decision log", "Rae", "On track", "Close open items"] },
    ],
  };
  const insights = [
    {
      label: "Focus is narrowing",
      detail: "The highest-impact work is concentrated in two active workstreams.",
      tone: "positive" as const,
    },
    {
      label: "Blocked items need owners",
      detail: "A small set of unresolved decisions is slowing the next review cycle.",
      tone: "warning" as const,
    },
    {
      label: "Preview data only",
      detail: "Values are generated for the demo and should be replaced with connected source data later.",
      tone: "neutral" as const,
    },
  ];

  return {
    title,
    subtitle: "AI-generated preview data for the planned board",
    dataDisclosure: "Values are AI-generated preview data.",
    recommendedVisualization: visualization,
    metrics,
    timeSeries: visualization === "line_chart" || visualization === "composite" ? timeSeries : {
      title: "",
      series: [],
      points: [],
      projectionStartIndex: -1,
    },
    table: visualization === "table" || visualization === "composite" ? table : {
      title: "",
      columns: [],
      rows: [],
    },
    insights: visualization === "insights" || visualization === "composite" ? insights : insights.slice(0, 1),
    formFields: visualization === "form"
      ? [
          { label: "Review date", placeholder: "2026-07-01", type: "date" },
          { label: "Target metric", placeholder: "Activation rate", type: "text" },
          { label: "Risk threshold", placeholder: "10%", type: "number" },
          { label: "Decision owner", placeholder: "Operations lead", type: "text" },
        ]
      : [],
    funnel: { title: "", steps: [] },
    gauges: [],
    ranking: { title: "", items: [] },
    milestones: { title: "", items: [] },
    donut: { title: "", segments: [] },
  };
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

function widgetPosition(index: number, count: number) {
  const columns = gridColumns(count);
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
  const columns = gridColumns(widgetCount);
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
    `Show a forecast and projection view for ${purpose} using ${metrics}`,
    `Show a status table for ${tasks}`,
    `Summarize risks, blockers, opportunities, and recommendations for ${purpose}`,
    `Compare the important segments, sources, or workstreams for ${audience} using ${dataSources}`,
    `Show a leaderboard or ranking of top contributors, accounts, or workstreams for ${audience}`,
    `Show a conversion funnel or activation drop-off view for ${purpose}`,
    `Show gauge-style value-vs-target metrics for ${metrics}`,
    `Show milestone and readiness timeline for ${tasks}`,
    `Show recommended decisions, next actions, owners, and due dates for ${audience} based on ${notes}`,
  ];

  return prompts.map((prompt, index) => {
    const widgetPrompt = promptWithPreviewQualifier(prompt, brief);

    return {
      ...widgetPosition(index, prompts.length),
      exampleData: fallbackWidgetExampleData(widgetPrompt, index),
      height: FALLBACK_WIDGET_HEIGHT,
      prompt: widgetPrompt,
      width: FALLBACK_WIDGET_WIDTH,
    };
  });
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
    {
      body: brief.tasks
        ? clipped(`Prioritize ${brief.tasks}.`, 180)
        : "Focus on the highest-impact workstreams and owners.",
      color: "rose" as const,
      title: "Priorities",
    },
    {
      body: brief.notes
        ? clipped(brief.notes, 180)
        : "Watch for blockers, assumptions, and open decisions.",
      color: "blue" as const,
      title: "Risks & assumptions",
    },
  ].filter((note) => note.body.trim());

  return notes.slice(0, 5).map((note, index, currentNotes) => ({
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
