import { z } from "zod/v4";

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

export const exampleWidgetDataSchema = z.object({
  title: z.string().describe("Dashboard widget title."),
  subtitle: z.string().describe("Short context line for the widget."),
  dataDisclosure: z
    .string()
    .describe("Disclosure that this is preview/demo data, not verified source data."),
  recommendedVisualization: z
    .enum(["metrics", "line_chart", "bar_chart", "table", "insights", "form", "composite"])
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
});

export type Tone = z.infer<typeof toneSchema>;
export type MetricData = z.infer<typeof metricSchema>;
export type ChartSeries = z.infer<typeof chartSeriesSchema>;
export type ChartPoint = z.infer<typeof chartPointSchema>;
export type TableData = z.infer<typeof tableSchema>;
export type InsightData = z.infer<typeof insightSchema>;
export type FormFieldData = z.infer<typeof formFieldSchema>;
export type ExampleWidgetData = z.infer<typeof exampleWidgetDataSchema>;

export type CanvasWidgetStatus = "streaming" | "done" | "error";

export const canvasWidgetSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
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
