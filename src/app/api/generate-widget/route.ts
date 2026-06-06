import Groq from "groq-sdk";
import OpenAI from "openai";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z, ZodError, toJSONSchema } from "zod/v4";
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
const DEFAULT_OPENAI_MODEL = "gpt-5.5";
const OPENUI_PROMPT_PATH = join(process.cwd(), "src/generated/openui-dashboard-prompt.txt");
const aiProviderSchema = z.enum(["openai", "groq"]);

let cachedOpenUIPrompt: string | null = null;

type AIProvider = z.infer<typeof aiProviderSchema>;
type ModelClient = Groq | OpenAI;
type ChatCompletionResult = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};
type ChatCompletionStream = AsyncIterable<{
  choices?: Array<{
    delta?: {
      content?: string | null;
    };
  }>;
}>;

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

function resolveProvider(value: unknown): AIProvider {
  const parsed = aiProviderSchema.safeParse(value);

  return parsed.success ? parsed.data : "groq";
}

function providerDisplayName(provider: AIProvider) {
  return provider === "openai" ? "OpenAI" : "Groq";
}

function getApiKey(provider: AIProvider) {
  return provider === "openai" ? process.env.OPENAI_API_KEY : process.env.GROQ_API_KEY;
}

function getMockDataModel(provider: AIProvider) {
  if (provider === "openai") {
    return process.env.OPENAI_MOCK_DATA_MODEL || process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
  }

  return process.env.GROQ_MOCK_DATA_MODEL || DEFAULT_MOCK_DATA_MODEL;
}

function getUIModel(provider: AIProvider) {
  if (provider === "openai") {
    return process.env.OPENAI_UI_MODEL || process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
  }

  return process.env.GROQ_UI_MODEL || DEFAULT_UI_MODEL;
}

function createModelClient(provider: AIProvider, apiKey: string): ModelClient {
  return provider === "openai" ? new OpenAI({ apiKey }) : new Groq({ apiKey });
}

async function createChatCompletion(client: ModelClient, params: Record<string, unknown>) {
  const completions = client.chat.completions as unknown as {
    create: (completionParams: Record<string, unknown>) => Promise<unknown>;
  };

  return completions.create(params);
}

function mockDataSystemPrompt() {
  return [
    "You generate realistic AI-native startup operating data for a dashboard widget.",
    "The data is for UI prototyping only, not factual source data.",
    "Return data that fits the user's dashboard request.",
    "Assume the user is building a dashboard for a fast-growing AI startup unless they explicitly ask for another domain.",
    "Use plausible startup metrics: ARR, MRR, burn, runway, CAC, LTV, activation, retention, churn, pipeline, conversion, usage, support, hiring, cash, product velocity, AI infra spend, token waste, retry cost, context length, eval pass rate, model mix, agent runs, and token efficiency.",
    "Make vague requests feel like an AI company trying to tokenmaxx: show how the team is reducing wasted tokens, oversized prompts, failed runs, retries, and expensive model usage while growing useful AI output.",
    "Prefer believable ranges and units for an early-to-growth-stage software startup; avoid round-number filler like 1000, 5000, or 10% unless the context makes it natural.",
    "Avoid flat charts. Every timeSeries should show believable movement: ramps, seasonality, step changes, optimizations, or forecast changes. Do not repeat the same value across points unless the prompt explicitly asks for a constant baseline.",
    "Make related values internally consistent: deltas should match the trend, runway should fit burn and cash, funnel counts should decrease at each stage, and percentages should stay in valid ranges.",
    "Use realistic labels such as recent months, weeks, customer segments, acquisition channels, plans, roles, regions, product areas, agent workflows, model families, context tiers, or customer cohorts instead of generic labels like Item 1 or Series A.",
    "When the request is vague, choose a credible B2B AI SaaS scenario and include enough specificity to make the widget feel real.",
    "Do not use famous company names, real customer names, private facts, or claims that imply the data came from a real business.",
    "Always set dataDisclosure to a concise sentence saying the values are AI-generated preview data.",
    "Set recommendedVisualization to the best primary layout: metrics, line_chart, bar_chart, table, insights, form, or composite.",
    "Use metrics for KPI, scorecard, current value, or snapshot requests.",
    "Use line_chart or bar_chart for trend, forecast, comparison, graph, or chart requests.",
    "Use table for table, list, breakdown, details, or by-segment requests.",
    "Use insights for analysis, why, recommendation, risk, anomaly, or opportunity requests.",
    "Use form for requested forms, inputs, planners, or calculators.",
    "Use composite only when the prompt clearly benefits from multiple complementary blocks.",
    "For numeric trend requests, include both current metric values and a compact timeSeries whenever a recent trend is plausible.",
    "Do not populate timeSeries just to force a chart when the user asks for a table, form, written analysis, or KPI snapshot.",
    "For spend, runway, burn, MRR, cash, retention, conversion, usage, support, and pipeline trend requests, populate timeSeries unless the user explicitly asks for only a single number or KPI card.",
    "For runway or runway-left requests, make timeSeries a forward-looking cash runway forecast: future month labels on the x-axis and cash remaining/money left on the y-axis.",
    "For runway charts, do not chart monthly burn, spend, or money spent as the primary series; burn can appear only as a supporting metric card.",
    "Use table data for explicit table, list, breakdown, by-segment, or detail requests.",
    "Keep insights brief. Use them as primary content only when the user asks for analysis, recommendations, risks, anomalies, or opportunities.",
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
    "Choose the layout from USER_PROMPT and EXAMPLE_DATA.recommendedVisualization.",
    "Use MetricGrid only for KPI, scorecard, current value, or snapshot requests, or as a supporting summary.",
    "Use LineChart or BarChart for trend, forecast, comparison, graph, or chart requests.",
    "Use DataTable as the primary block for table, list, breakdown, details, or by-segment requests.",
    "Use InsightList as the primary block for analysis, why, recommendation, risk, anomaly, or opportunity requests.",
    "Use FormPreview as the primary block for requested forms, inputs, planners, or calculators.",
    "For composite requests, use two or three complementary blocks. Good stacks include MetricGrid plus DataTable, chart plus InsightList, MetricGrid plus chart, or DataTable plus InsightList.",
    "For runway left requests, the chart must show future months and cash remaining/money left, not burn or spend history.",
    "Do not put MetricGrid before every widget. Add it only when current metrics help answer the prompt.",
    "Use one to three blocks. Avoid repeating the same MetricGrid plus chart stack across unrelated prompts.",
    "Avoid text-heavy layouts. Keep titles, subtitles, labels, and disclosure short.",
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
    const compactMatch = value.replace(/[$,%\s,]/g, "").match(/^-?\d+(?:\.\d+)?$/);
    const parsed = compactMatch ? Number(compactMatch[0]) : Number.NaN;

    if (Number.isFinite(parsed)) {
      return parsed;
    }

    const magnitudeMatch = value.replace(/,/g, "").match(/(-?\d+(?:\.\d+)?)(?:\s*([kmb])(?=$|[^a-z]))?/i);

    if (magnitudeMatch) {
      const amount = Number(magnitudeMatch[1]);
      const suffix = magnitudeMatch[2]?.toLowerCase();
      const multiplier = suffix === "b" ? 1_000_000_000 : suffix === "m" ? 1_000_000 : suffix === "k" ? 1_000 : 1;

      if (Number.isFinite(amount)) {
        return amount * multiplier;
      }
    }
  }

  return null;
}

function isRunwayPrompt(prompt: string) {
  const normalized = prompt.toLowerCase();

  return (
    /\brunway\b/.test(normalized) ||
    /\bcash\s+(left|remaining|runout|run\s+out|depletion)\b/.test(normalized) ||
    /\bmonths?\s+(left|remaining)\b/.test(normalized)
  );
}

function looksLikeMoneyValue(value: string) {
  return /[$€£]/.test(value) || /-?\d+(?:\.\d+)?\s*[kmb](?=$|[^a-z])/i.test(value);
}

function metricNumber(
  metrics: ExampleWidgetData["metrics"],
  matcher: RegExp,
  options: { moneyOnly?: boolean; nonMoneyOnly?: boolean } = {},
) {
  for (const metric of metrics) {
    if (matcher.test(metric.label.toLowerCase())) {
      const hasMoneyUnit = looksLikeMoneyValue(metric.value);

      if (options.moneyOnly && !hasMoneyUnit) {
        continue;
      }

      if (options.nonMoneyOnly && hasMoneyUnit) {
        continue;
      }

      const value = asNumber(metric.value);

      if (value !== null) {
        return value;
      }
    }
  }

  return null;
}

function monthLabel(monthOffset: number) {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + monthOffset);

  return date.toLocaleString("en-US", { month: "short" });
}

function runwayMoneyUnit(cashValue: number | null) {
  return cashValue !== null && Math.abs(cashValue) >= 1_000_000 ? "millions" : "thousands";
}

function inferredRunwayMoneyUnit(cashValue: number | null, label: string, values: number[]) {
  const normalizedLabel = label.toLowerCase();

  if (/\$m|\bm\b|million/.test(normalizedLabel)) {
    return "millions";
  }

  if (/\$k|\bk\b|thousand/.test(normalizedLabel)) {
    return "thousands";
  }

  if (cashValue !== null) {
    return runwayMoneyUnit(cashValue);
  }

  const maxValue = Math.max(...values.map((value) => Math.abs(value)), 0);

  return maxValue >= 1_000_000 ? "millions" : "thousands";
}

function runwaySeriesLabel(unit: "millions" | "thousands") {
  return unit === "millions" ? "Cash remaining ($M)" : "Cash remaining ($k)";
}

function runwayDisplayValue(value: number, unit: "millions" | "thousands") {
  return `$${value}${unit === "millions" ? "M" : "k"}`;
}

function scaleRunwayCash(value: number, unit: "millions" | "thousands") {
  const divisor = unit === "millions" ? 1_000_000 : 1_000;
  const scaledValue = value / divisor;

  return unit === "millions" ? Math.round(scaledValue * 10) / 10 : Math.round(scaledValue);
}

function normalizeExistingRunwayValue(value: number, unit: "millions" | "thousands") {
  if (Math.abs(value) >= 10_000) {
    return scaleRunwayCash(value, unit);
  }

  return unit === "millions" ? Math.round(value * 10) / 10 : Math.round(value);
}

function normalizeExistingRunwayCashSeries(data: ExampleWidgetData, cashValue: number | null): ExampleWidgetData {
  const cashSeriesIndex = data.timeSeries.series.findIndex((series) => {
    const label = series.label.toLowerCase();

    return /\b(cash|money|remaining)\b/.test(label) && !/\b(burn|spend|spent)\b/.test(label);
  });

  if (cashSeriesIndex < 0) {
    return data;
  }

  const rawValues = data.timeSeries.points.map((point) => point.values[cashSeriesIndex] ?? point.values[0] ?? 0);
  const unit = inferredRunwayMoneyUnit(cashValue, data.timeSeries.series[cashSeriesIndex]?.label ?? "", rawValues);

  return {
    ...data,
    recommendedVisualization: "line_chart",
    timeSeries: {
      ...data.timeSeries,
      title: "Projected Cash Remaining",
      series: [
        {
          label: runwaySeriesLabel(unit),
          tone: data.timeSeries.series[cashSeriesIndex]?.tone ?? "warning",
        },
      ],
      points: data.timeSeries.points.slice(0, 8).map((point, index) => ({
        label: monthLabel(index),
        values: [normalizeExistingRunwayValue(point.values[cashSeriesIndex] ?? point.values[0] ?? 0, unit)],
      })),
    },
  };
}

function normalizeRunwayForecast(data: ExampleWidgetData, prompt: string): ExampleWidgetData {
  if (!isRunwayPrompt(prompt)) {
    return data;
  }

  const cashOnHand =
    metricNumber(data.metrics, /\b(cash|balance|money left|money remaining)\b/, { moneyOnly: true }) ??
    metricNumber(data.metrics, /\brunway\b/, { moneyOnly: true });
  const monthlyBurn = metricNumber(data.metrics, /\b(burn|spend|spending)\b/, { moneyOnly: true });
  const runwayMonths = metricNumber(data.metrics, /\b(runway|months? left|months? remaining)\b/, {
    nonMoneyOnly: true,
  });
  const inferredBurn = monthlyBurn ?? (cashOnHand !== null && runwayMonths ? cashOnHand / runwayMonths : null);
  const inferredCash = cashOnHand ?? (inferredBurn !== null && runwayMonths ? inferredBurn * runwayMonths : null);

  if (inferredCash === null || inferredBurn === null || inferredBurn <= 0) {
    return normalizeExistingRunwayCashSeries(data, cashOnHand);
  }

  const unit = runwayMoneyUnit(inferredCash);
  const pointCount = Math.min(8, Math.max(4, Math.ceil(inferredCash / inferredBurn) + 1));
  const points = Array.from({ length: pointCount }, (_, index) => {
    const cashRemaining = Math.max(0, inferredCash - inferredBurn * index);

    return {
      label: monthLabel(index),
      values: [scaleRunwayCash(cashRemaining, unit)],
    };
  });

  return {
    ...data,
    recommendedVisualization: "line_chart",
    subtitle: data.subtitle || "Future cash remaining at current burn",
    table: {
      title: "Cash runway forecast",
      columns: ["Month", "Cash remaining"],
      rows: points.map((point) => ({
        cells: [point.label, runwayDisplayValue(point.values[0], unit)],
      })),
    },
    timeSeries: {
      title: "Projected Cash Remaining",
      series: [
        {
          label: runwaySeriesLabel(unit),
          tone: "warning",
        },
      ],
      points,
      projectionStartIndex: -1,
    },
  };
}

function promptHash(prompt: string) {
  let hash = 2166136261;

  for (let index = 0; index < prompt.length; index += 1) {
    hash ^= prompt.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function applyVariance(value: number, seed: number, amount = 0.07) {
  const wave = Math.sin(seed * 12.9898) * 43758.5453;
  const normalized = wave - Math.floor(wave);
  const multiplier = 1 + (normalized * 2 - 1) * amount;

  return Math.round(value * multiplier * 10) / 10;
}

function hasTokenMaxxingIntent(prompt: string) {
  return /\b(ai|llm|model|token|tokens|context|prompt|agent|agents|eval|inference|run|runs|retry|retries|waste|spend|cost|usage|workflow|native)\b/i.test(
    prompt,
  );
}

function hasRevenueIntent(prompt: string) {
  return /\b(arr|mrr|revenue|sales|bookings|growth|customers?|logos?|churn|retention|activation)\b/i.test(
    prompt,
  );
}

function hasPipelineIntent(prompt: string) {
  return /\b(pipeline|funnel|leads?|opportunities|demo|demos|conversion|trial|sales)\b/i.test(prompt);
}

function hasBreakdownIntent(prompt: string) {
  return /\b(table|list|breakdown|by model|by workflow|by channel|by segment|by team|details?)\b/i.test(prompt);
}

function hasChartIntent(prompt: string) {
  return /\b(chart|graph|trend|forecast|projection|compare|comparison|over time|time series|timeseries|history|monthly|weekly|daily|line|bar)\b/i.test(
    prompt,
  );
}

function hasInsightIntent(prompt: string) {
  return /\b(insights?|analysis|analyze|why|explain|recommend|recommendation|risk|risks|anomal(y|ies)|opportunit(y|ies)|diagnose|summarize|summary)\b/i.test(
    prompt,
  );
}

function hasFormIntent(prompt: string) {
  return /\b(form|input|intake|planner|calculator|configure|configuration|scenario planner|budget planner)\b/i.test(prompt);
}

function hasMetricSnapshotIntent(prompt: string) {
  return /\b(kpis?|scorecard|snapshot|current|status|single number|single metric|metrics only|cards only)\b/i.test(prompt);
}

function emptyTimeSeries(): ExampleWidgetData["timeSeries"] {
  return {
    title: "",
    series: [],
    points: [],
    projectionStartIndex: -1,
  };
}

function emptyTable(): ExampleWidgetData["table"] {
  return {
    title: "",
    columns: [],
    rows: [],
  };
}

function isGenericLabel(value: string) {
  return /^(item|series|metric|value|point)\s*\d*$/i.test(value.trim());
}

function timeSeriesIsFlat(data: ExampleWidgetData) {
  const { points, series } = data.timeSeries;

  if (points.length < 4 || series.length === 0) {
    return true;
  }

  return series.every((_, seriesIndex) => {
    const values = points
      .map((point) => point.values[seriesIndex])
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

    if (values.length < 4) {
      return true;
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const average = values.reduce((sum, value) => sum + Math.abs(value), 0) / values.length;

    return max - min <= Math.max(1, average * 0.025);
  });
}

function hasGenericTimeSeries(data: ExampleWidgetData) {
  return (
    data.timeSeries.series.some((series) => isGenericLabel(series.label)) ||
    data.timeSeries.points.some((point) => isGenericLabel(point.label))
  );
}

function aiNativeMetrics(seed: number): ExampleWidgetData["metrics"] {
  return [
    {
      label: "AI infra spend",
      value: `$${applyVariance(48.6, seed, 0.09)}k`,
      delta: "+16.8% vs last 30d",
      tone: "warning",
    },
    {
      label: "Token waste",
      value: `${applyVariance(21.4, seed + 1, 0.08)}%`,
      delta: "-4.6pp after prompt trimming",
      tone: "positive",
    },
    {
      label: "Agent runs",
      value: `${Math.round(applyVariance(184, seed + 2, 0.1))}k`,
      delta: "+31.2% with eval gate on",
      tone: "positive",
    },
    {
      label: "Retry cost",
      value: `$${applyVariance(8.7, seed + 3, 0.12)}k`,
      delta: "+$1.1k from tool failures",
      tone: "negative",
    },
  ];
}

function aiNativeTrend(seed: number): ExampleWidgetData["timeSeries"] {
  const points = [
    { label: "Jan", values: [31.8, 12.6, 4.1] },
    { label: "Feb", values: [35.9, 13.8, 5.4] },
    { label: "Mar", values: [41.7, 15.9, 6.8] },
    { label: "Apr", values: [47.2, 17.4, 8.6] },
    { label: "May", values: [45.5, 13.1, 7.2] },
    { label: "Jun", values: [48.6, 10.4, 8.7] },
  ].map((point, pointIndex) => ({
    ...point,
    values: point.values.map((value, valueIndex) => applyVariance(value, seed + pointIndex * 7 + valueIndex, 0.055)),
  }));

  return {
    title: "AI Spend Quality",
    series: [
      { label: "Productive spend ($k)", tone: "positive" },
      { label: "Wasted spend ($k)", tone: "negative" },
      { label: "Retry/tool spend ($k)", tone: "warning" },
    ],
    points,
    projectionStartIndex: -1,
  };
}

function revenueTrend(seed: number): ExampleWidgetData["timeSeries"] {
  const points = [
    { label: "Jan", values: [212, 29.4] },
    { label: "Feb", values: [238, 31.7] },
    { label: "Mar", values: [263, 36.2] },
    { label: "Apr", values: [301, 42.8] },
    { label: "May", values: [337, 45.5] },
    { label: "Jun", values: [386, 48.6] },
  ].map((point, pointIndex) => ({
    ...point,
    values: point.values.map((value, valueIndex) => applyVariance(value, seed + pointIndex * 5 + valueIndex, 0.045)),
  }));

  return {
    title: "MRR and AI Cost Base",
    series: [
      { label: "MRR ($k)", tone: "positive" },
      { label: "AI infra spend ($k)", tone: "warning" },
    ],
    points,
    projectionStartIndex: -1,
  };
}

function pipelineTrend(seed: number): ExampleWidgetData["timeSeries"] {
  const points = [
    { label: "Website", values: [840, 126, 38] },
    { label: "PLG", values: [612, 174, 51] },
    { label: "Founder-led", values: [148, 62, 29] },
    { label: "Partners", values: [96, 37, 16] },
    { label: "Outbound", values: [384, 54, 12] },
  ].map((point, pointIndex) => ({
    ...point,
    values: point.values.map((value, valueIndex) => Math.round(applyVariance(value, seed + pointIndex * 11 + valueIndex, 0.08))),
  }));

  return {
    title: "AI Startup Funnel by Channel",
    series: [
      { label: "Qualified leads", tone: "neutral" },
      { label: "Trials", tone: "warning" },
      { label: "Paid conversions", tone: "positive" },
    ],
    points,
    projectionStartIndex: -1,
  };
}

function runwayStartupData(seed: number): ExampleWidgetData {
  const cash = applyVariance(2.9, seed, 0.06);
  const burn = applyVariance(312, seed + 1, 0.08);
  const aiSpend = applyVariance(48.6, seed + 2, 0.08);
  const points = [2.9, 2.58, 2.25, 1.91, 1.55, 1.18, 0.79, 0.39].map((value, index) => ({
    label: monthLabel(index),
    values: [Math.max(0, applyVariance(value, seed + index, 0.035))],
  }));

  return {
    title: "AI Startup Runway",
    subtitle: "Cash forecast at current hiring and model-spend plan",
    dataDisclosure: "Values are AI-generated preview data.",
    recommendedVisualization: "line_chart",
    metrics: [
      { label: "Cash balance", value: `$${cash}M`, delta: "8.7 months remaining", tone: "warning" },
      { label: "Monthly burn", value: `$${Math.round(burn)}k`, delta: "+$34k vs last month", tone: "negative" },
      { label: "AI infra spend", value: `$${aiSpend}k`, delta: "15.6% of burn", tone: "warning" },
      { label: "Token waste", value: "21.4%", delta: "-4.6pp after routing", tone: "positive" },
    ],
    timeSeries: {
      title: "Projected Cash Remaining",
      series: [{ label: "Cash remaining ($M)", tone: "warning" }],
      points,
      projectionStartIndex: 1,
    },
    table: {
      title: "Cash runway forecast",
      columns: ["Month", "Cash remaining"],
      rows: points.map((point) => ({ cells: [point.label, `$${point.values[0]}M`] })),
    },
    insights: [
      {
        label: "AI spend is material",
        detail: "Model and agent infrastructure now explain roughly one sixth of monthly burn.",
        tone: "warning",
      },
    ],
    formFields: [],
  };
}

function createAiNativeStartupData(prompt: string): ExampleWidgetData {
  const seed = promptHash(prompt || "ai-native-startup");
  const normalizedPrompt = prompt.toLowerCase();
  const wantsForm = hasFormIntent(normalizedPrompt);
  const wantsTable = hasBreakdownIntent(normalizedPrompt);
  const wantsChart = hasChartIntent(normalizedPrompt);
  const wantsInsights = hasInsightIntent(normalizedPrompt);
  const wantsMetricsSnapshot = hasMetricSnapshotIntent(normalizedPrompt);

  if (wantsForm) {
    return {
      title: "AI Spend Scenario Planner",
      subtitle: "Inputs for forecasting model budget and waste",
      dataDisclosure: "Values are AI-generated preview data.",
      recommendedVisualization: "form",
      metrics: [
        { label: "Current AI spend", value: `$${applyVariance(48.6, seed, 0.09)}k`, delta: "Latest month", tone: "warning" },
        { label: "Current waste rate", value: `${applyVariance(21.4, seed + 1, 0.08)}%`, delta: "-4.6pp after routing", tone: "positive" },
      ],
      timeSeries: emptyTimeSeries(),
      table: emptyTable(),
      insights: [
        {
          label: "Scenario inputs are directional",
          detail: "Use these fields to preview budget sensitivity before connecting real billing data.",
          tone: "neutral",
        },
      ],
      formFields: [
        { label: "Monthly agent runs", type: "number", placeholder: `${Math.round(applyVariance(184000, seed + 2, 0.1))}` },
        { label: "Target waste rate", type: "number", placeholder: "12%" },
        { label: "Model budget cap", type: "number", placeholder: "$52000" },
        { label: "Review date", type: "date", placeholder: "2026-07-01" },
      ],
    };
  }

  if (isRunwayPrompt(prompt)) {
    return runwayStartupData(seed);
  }

  const isPipeline = hasPipelineIntent(normalizedPrompt);
  const isRevenue = hasRevenueIntent(normalizedPrompt) && !hasTokenMaxxingIntent(normalizedPrompt);
  const baseTimeSeries = isPipeline ? pipelineTrend(seed) : isRevenue ? revenueTrend(seed) : aiNativeTrend(seed);
  const timeSeries = wantsChart || (!wantsTable && !wantsInsights && !wantsMetricsSnapshot)
    ? baseTimeSeries
    : emptyTimeSeries();
  const metrics: ExampleWidgetData["metrics"] = isRevenue
    ? [
        { label: "MRR", value: `$${applyVariance(386, seed, 0.05)}k`, delta: "+14.5% MoM", tone: "positive" },
        { label: "Net revenue retention", value: `${applyVariance(128.4, seed + 1, 0.03)}%`, delta: "+3.1pp QoQ", tone: "positive" },
        { label: "AI gross margin drag", value: `${applyVariance(6.8, seed + 2, 0.08)}pp`, delta: "-1.4pp after routing", tone: "positive" },
        { label: "Enterprise logos", value: `${Math.round(applyVariance(42, seed + 3, 0.08))}`, delta: "+7 this quarter", tone: "positive" },
      ]
    : isPipeline
      ? [
          { label: "Qualified leads", value: `${Math.round(applyVariance(2080, seed, 0.07))}`, delta: "+22.1% MoM", tone: "positive" },
          { label: "Trials started", value: `${Math.round(applyVariance(453, seed + 1, 0.08))}`, delta: "+18.4% MoM", tone: "positive" },
          { label: "Paid conversion", value: `${applyVariance(7.0, seed + 2, 0.07)}%`, delta: "+1.2pp from eval sandbox", tone: "positive" },
          { label: "CAC payback", value: `${applyVariance(8.9, seed + 3, 0.05)} mo`, delta: "-0.8 mo", tone: "positive" },
        ]
      : aiNativeMetrics(seed);

  const table = wantsTable
    ? {
        title: "Tokenmaxxing Breakdown",
        columns: ["Workflow", "Monthly runs", "AI spend", "Waste rate"],
        rows: [
          { cells: ["Research agent", "62.4k", "$14.8k", "18.2%"] },
          { cells: ["Support copilot", "48.1k", "$8.6k", "12.7%"] },
          { cells: ["Code review agent", "31.9k", "$11.3k", "24.5%"] },
          { cells: ["Sales enrichment", "24.7k", "$6.2k", "19.8%"] },
          { cells: ["Eval harness", "16.5k", "$7.7k", "9.4%"] },
        ],
      }
    : emptyTable();
  const insights: ExampleWidgetData["insights"] = wantsInsights
    ? [
        {
          label: "Retries are the biggest avoidable cost",
          detail: "Tool failures and oversized contexts create most of the wasted model spend.",
          tone: "warning",
        },
        {
          label: "Routing is paying back",
          detail: "Cheaper model routing reduced waste while useful output tokens kept growing.",
          tone: "positive",
        },
        {
          label: "Review code agents first",
          detail: "The highest retry rate sits in workflows with long context and brittle tool calls.",
          tone: "negative",
        },
      ]
    : [
        {
          label: "Routing is paying back",
          detail: "Cheaper model routing reduced wasted spend while useful output tokens kept growing.",
          tone: "positive",
        },
        {
          label: "Retries remain expensive",
          detail: "Tool failures and oversized contexts still create the largest avoidable cost pocket.",
          tone: "warning",
        },
      ];
  const recommendedVisualization: ExampleWidgetData["recommendedVisualization"] = wantsTable
    ? wantsChart
      ? "composite"
      : "table"
    : wantsInsights && !wantsChart
      ? "insights"
      : wantsMetricsSnapshot && !wantsChart
        ? "metrics"
        : "line_chart";

  return {
    title: isPipeline ? "AI Startup Growth Funnel" : isRevenue ? "AI Startup Revenue Pulse" : "Tokenmaxxing Operating Pulse",
    subtitle: isPipeline
      ? "Lead-to-paid motion across AI-native acquisition channels"
      : isRevenue
        ? "Revenue growth with AI infrastructure margin pressure"
        : "Spend, wasted tokens, and useful AI output for a scaling agent platform",
    dataDisclosure: "Values are AI-generated preview data.",
    recommendedVisualization,
    metrics,
    timeSeries,
    table,
    insights,
    formFields: [],
  };
}

function needsAiNativeStartupReplacement(data: ExampleWidgetData, prompt: string) {
  if (data.formFields.length > 0) {
    return false;
  }

  const hasRequestedNonChartData =
    (data.recommendedVisualization === "table" && data.table.columns.length > 0 && data.table.rows.length > 0) ||
    (data.recommendedVisualization === "insights" && data.insights.length > 0) ||
    (data.recommendedVisualization === "metrics" && data.metrics.length > 0);

  if (hasRequestedNonChartData) {
    return false;
  }

  return (
    timeSeriesIsFlat(data) ||
    hasGenericTimeSeries(data) ||
    (hasTokenMaxxingIntent(prompt) && !/\b(ai|token|model|agent|context|retry|waste|spend)\b/i.test(data.title + data.subtitle))
  );
}

function mergeRequestedTable(source: ExampleWidgetData, fallback: ExampleWidgetData, prompt: string) {
  if (source.table.columns.length > 0 && source.table.rows.length > 0 && !hasGenericTimeSeries(source)) {
    return source.table;
  }

  if (hasBreakdownIntent(prompt)) {
    return fallback.table;
  }

  return {
    title: "",
    columns: [],
    rows: [],
  };
}

function enrichAiNativeStartupData(data: ExampleWidgetData, prompt: string): ExampleWidgetData {
  const runwayNormalizedData = normalizeRunwayForecast(data, prompt);

  if (!needsAiNativeStartupReplacement(runwayNormalizedData, prompt)) {
    return {
      ...runwayNormalizedData,
      dataDisclosure: runwayNormalizedData.dataDisclosure || "Values are AI-generated preview data.",
    };
  }

  const fallback = createAiNativeStartupData(prompt);

  return {
    ...fallback,
    title: runwayNormalizedData.title && !/^generated widget$/i.test(runwayNormalizedData.title)
      ? runwayNormalizedData.title
      : fallback.title,
    subtitle: runwayNormalizedData.subtitle || fallback.subtitle,
    dataDisclosure: runwayNormalizedData.dataDisclosure || fallback.dataDisclosure,
    table: mergeRequestedTable(runwayNormalizedData, fallback, prompt),
    formFields: runwayNormalizedData.formFields,
  };
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

function parseExampleData(content: string | null | undefined, provider: AIProvider, prompt: string) {
  if (!content) {
    throw new Error(`${providerDisplayName(provider)} returned no example data.`);
  }

  return enrichAiNativeStartupData(exampleWidgetDataSchema.parse(normalizeExampleData(JSON.parse(content))), prompt);
}

async function createStrictExampleData(client: ModelClient, provider: AIProvider, prompt: string) {
  const schema = toJSONSchema(exampleWidgetDataSchema);

  const completion = (await createChatCompletion(client, {
    model: getMockDataModel(provider),
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
    ...(provider === "groq" ? { temperature: 0.2 } : {}),
  })) as ChatCompletionResult;

  return parseExampleData(completion.choices?.[0]?.message?.content, provider, prompt);
}

async function createJsonObjectExampleData(client: ModelClient, provider: AIProvider, prompt: string) {
  const completion = (await createChatCompletion(client, {
    model: getMockDataModel(provider),
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
    ...(provider === "groq" ? { temperature: 0.2 } : {}),
  })) as ChatCompletionResult;

  return parseExampleData(completion.choices?.[0]?.message?.content, provider, prompt);
}

async function createExampleData(client: ModelClient, provider: AIProvider, prompt: string) {
  try {
    return await createStrictExampleData(client, provider, prompt);
  } catch {
    return createJsonObjectExampleData(client, provider, prompt);
  }
}

async function streamOpenUI(
  client: ModelClient,
  provider: AIProvider,
  prompt: string,
  exampleData: ExampleWidgetData,
  controller: ReadableStreamDefaultController,
) {
  const stream = (await createChatCompletion(client, {
    model: getUIModel(provider),
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
    max_completion_tokens: 1800,
    ...(provider === "openai" ? { reasoning_effort: "low" } : { temperature: 0.15 }),
    stream: true,
  })) as ChatCompletionStream;

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;

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
        const body = (await request.json()) as { prompt?: unknown };
        const provider = resolveProvider(process.env.AI_PROVIDER);
        const apiKey = getApiKey(provider);

        if (!apiKey) {
          streamEvent(controller, {
            type: "error",
            error: `Missing ${provider === "openai" ? "OPENAI_API_KEY" : "GROQ_API_KEY"}. Add it to your environment and retry.`,
          });
          return;
        }

        const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

        if (!prompt) {
          streamEvent(controller, {
            type: "error",
            error: "Enter a prompt before generating a widget.",
          });
          return;
        }

        const client = createModelClient(provider, apiKey);
        const exampleData = await createExampleData(client, provider, prompt);

        streamEvent(controller, {
          type: "exampleData",
          data: exampleData,
        });

        await streamOpenUI(client, provider, prompt, exampleData, controller);

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
