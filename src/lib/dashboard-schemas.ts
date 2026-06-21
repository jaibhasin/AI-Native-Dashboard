import { z } from "zod/v4";

export const DEFAULT_NOTE_AUTHOR_NAME = "Team member";
export const TEMPLATE_AUTHOR_NAME = "Computer";

export const toneSchema = z
  .enum(["neutral", "positive", "negative", "warning"])
  .describe("Visual tone for the value or series.");

export const metricSchema = z
  .object({
    label: z.string().describe("Short metric label."),
    value: z.string().describe("Formatted metric value."),
    delta: z.string().describe("Short comparison text. Use an empty string if absent."),
    tone: toneSchema,
  })
  .describe("A single KPI value.");

export const chartSeriesSchema = z
  .object({
    label: z.string().describe("Human-readable series name."),
    tone: toneSchema,
  })
  .describe("One numeric series shown in a chart.");

export const chartPointSchema = z
  .object({
    label: z.string().describe("X-axis label, such as a day or month."),
    values: z.array(z.number()).describe("Values ordered to match the series list."),
  })
  .describe("One point on a chart.");

export const tableSchema = z
  .object({
    title: z.string().describe("Table title. Use an empty string if absent."),
    columns: z.array(z.string()).describe("Column labels."),
    rows: z
      .array(
        z.object({
          cells: z.array(z.string()).describe("Cells ordered to match columns."),
        }),
      )
      .describe("Table rows."),
  })
  .describe("Tabular data.");

export const insightSchema = z
  .object({
    label: z.string().describe("Short insight heading."),
    detail: z.string().describe("One concise sentence explaining the insight."),
    tone: toneSchema,
  })
  .describe("A short generated insight.");

export const formFieldSchema = z
  .object({
    label: z.string().describe("Field label."),
    type: z
      .enum(["text", "number", "date", "select"])
      .describe("Input style to preview."),
    placeholder: z.string().describe("Placeholder or example value."),
  })
  .describe("A form field preview.");

export const funnelStepSchema = z
  .object({
    label: z.string().describe("Funnel stage label."),
    value: z.number().describe("Count or amount at this stage."),
    dropoff: z.string().describe("Drop-off text from prior stage. Use empty string if first stage."),
    tone: toneSchema,
  })
  .describe("One funnel stage.");

export const funnelSchema = z
  .object({
    title: z.string().describe("Funnel title. Use empty string if absent."),
    steps: z.array(funnelStepSchema).describe("Ordered funnel stages."),
  })
  .describe("Conversion funnel data.");

export const gaugeSchema = z
  .object({
    label: z.string().describe("Gauge label."),
    value: z.number().describe("Current value."),
    target: z.number().describe("Target or max value."),
    unit: z.string().describe("Unit suffix such as % or empty string."),
    tone: toneSchema,
  })
  .describe("A progress gauge.");

export const rankingItemSchema = z
  .object({
    label: z.string().describe("Row label such as account name."),
    value: z.string().describe("Formatted primary value."),
    detail: z.string().describe("Secondary detail. Use empty string if absent."),
    badge: z.string().describe("Optional badge such as risk level. Use empty string if absent."),
    tone: toneSchema,
  })
  .describe("One ranked row.");

export const rankingSchema = z
  .object({
    title: z.string().describe("Ranking title. Use empty string if absent."),
    items: z.array(rankingItemSchema).describe("Ranked rows."),
  })
  .describe("Leaderboard or concentration ranking.");

export const milestoneStatusSchema = z
  .enum(["done", "active", "blocked", "todo"])
  .describe("Milestone status.");

export const milestoneItemSchema = z
  .object({
    label: z.string().describe("Milestone label."),
    detail: z.string().describe("Short detail. Use empty string if absent."),
    status: milestoneStatusSchema,
  })
  .describe("One milestone.");

export const milestonesSchema = z
  .object({
    title: z.string().describe("Timeline title. Use empty string if absent."),
    items: z.array(milestoneItemSchema).describe("Ordered milestones."),
  })
  .describe("Milestone or readiness timeline.");

export const donutSegmentSchema = z
  .object({
    label: z.string().describe("Segment label."),
    value: z.number().describe("Segment value or percentage."),
    tone: toneSchema,
  })
  .describe("One donut chart segment.");

export const donutSchema = z
  .object({
    title: z.string().describe("Donut chart title. Use empty string if absent."),
    segments: z.array(donutSegmentSchema).describe("Ordered donut segments."),
  })
  .describe("Donut or pie chart data.");

export const canvasNoteColorSchema = z.enum(["blue", "green", "amber", "rose"]);

export const canvasNoteSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  title: z.string(),
  body: z.string(),
  authorName: z.string().default(DEFAULT_NOTE_AUTHOR_NAME),
  color: canvasNoteColorSchema,
  widgetId: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const exampleWidgetDataSchema = z.object({
  title: z.string().describe("Dashboard widget title."),
  subtitle: z.string().describe("Short context line for the widget."),
  dataDisclosure: z
    .string()
    .describe("Disclosure that this is preview/demo data, not verified source data."),
  recommendedVisualization: z
    .enum([
      "metrics",
      "line_chart",
      "bar_chart",
      "table",
      "insights",
      "form",
      "composite",
      "stat",
      "funnel",
      "gauge",
      "ranking",
      "timeline",
      "donut_chart",
    ])
    .describe("Best visualization for the prompt."),
  metrics: z.array(metricSchema).describe("KPI values relevant to the prompt."),
  timeSeries: z
    .object({
      title: z.string().describe("Chart title. Use an empty string if absent."),
      series: z.array(chartSeriesSchema),
      points: z.array(chartPointSchema),
      projectionStartIndex: z
        .number()
        .describe("Zero-based index where projected values start. Use -1 if no projection."),
    })
    .describe("Time-series or category-series data."),
  table: tableSchema,
  insights: z.array(insightSchema).describe("Short observations about the example data."),
  formFields: z.array(formFieldSchema).describe("Fields for form preview requests."),
  funnel: funnelSchema.default({ title: "", steps: [] }).describe("Conversion funnel stages."),
  gauges: z.array(gaugeSchema).default([]).describe("Progress gauges for value-vs-target views."),
  ranking: rankingSchema.default({ title: "", items: [] }).describe("Ranked list or leaderboard data."),
  milestones: milestonesSchema.default({ title: "", items: [] }).describe("Milestone or readiness timeline."),
  donut: donutSchema.default({ title: "", segments: [] }).describe("Donut or pie chart segments."),
});

export type Tone = z.infer<typeof toneSchema>;
export type MetricData = z.infer<typeof metricSchema>;
export type ChartSeries = z.infer<typeof chartSeriesSchema>;
export type ChartPoint = z.infer<typeof chartPointSchema>;
export type TableData = z.infer<typeof tableSchema>;
export type InsightData = z.infer<typeof insightSchema>;
export type FormFieldData = z.infer<typeof formFieldSchema>;
export type FunnelStepData = z.infer<typeof funnelStepSchema>;
export type FunnelData = z.infer<typeof funnelSchema>;
export type GaugeData = z.infer<typeof gaugeSchema>;
export type RankingItemData = z.infer<typeof rankingItemSchema>;
export type RankingData = z.infer<typeof rankingSchema>;
export type MilestoneStatus = z.infer<typeof milestoneStatusSchema>;
export type MilestoneItemData = z.infer<typeof milestoneItemSchema>;
export type MilestonesData = z.infer<typeof milestonesSchema>;
export type DonutSegmentData = z.infer<typeof donutSegmentSchema>;
export type DonutData = z.infer<typeof donutSchema>;
export type CanvasNoteColor = z.infer<typeof canvasNoteColorSchema>;
export type CanvasNote = z.infer<typeof canvasNoteSchema>;
export type ExampleWidgetData = z.infer<typeof exampleWidgetDataSchema>;

export type CanvasWidgetStatus = "streaming" | "done" | "error";

export const canvasWidgetSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  authorName: z.string().default(DEFAULT_NOTE_AUTHOR_NAME),
  prompt: z.string(),
  exampleData: exampleWidgetDataSchema.nullable(),
  openuiSource: z.string(),
  status: z.enum(["streaming", "done", "error"]),
  createdAt: z.number(),
  updatedAt: z.number(),
  contentFitKey: z.string().optional(),
  error: z.string().optional(),
});

export type CanvasWidget = z.infer<typeof canvasWidgetSchema>;

export const canvasBoardSchema = z.object({
  id: z.string(),
  name: z.string(),
  widgets: z.array(canvasWidgetSchema),
  notes: z.array(canvasNoteSchema).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  templateId: z.string().optional(),
  templateVersion: z.number().optional(),
});

export type CanvasBoard = z.infer<typeof canvasBoardSchema>;
