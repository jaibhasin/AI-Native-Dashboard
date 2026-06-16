import type {
  CanvasBoard,
  CanvasNote,
  CanvasWidget,
  ChartPoint,
  ChartSeries,
  ExampleWidgetData,
  FormFieldData,
  InsightData,
  MetricData,
  TableData,
} from "@/lib/dashboard-schemas";
import { TEMPLATE_AUTHOR_NAME } from "@/lib/dashboard-schemas";

export const BLANK_BOARD_ID = "blank";
export const BOARD_TEMPLATE_VERSION = 5;

const TEMPLATE_WIDGET_WIDTH = 440;
const TEMPLATE_WIDGET_HEIGHT = 320;
const TEMPLATE_NOTE_WIDTH = 284;
const TEMPLATE_NOTE_HEIGHT = 108;
const TEMPLATE_CANVAS_CENTER_X = 100000;
const TEMPLATE_CANVAS_CENTER_Y = 100000;
const TEMPLATE_GAP = 36;
const TEMPLATE_NOTE_GAP = 18;
const TEMPLATE_NOTE_TOP_GAP = 28;
const PREVIEW_DISCLOSURE = "AI-generated preview data.";

export type TemplateGridCoordinate = 0 | 1 | 2;
type TemplateVisualization = ExampleWidgetData["recommendedVisualization"];
type TemplateWidgetDefinition = Pick<
  CanvasWidget,
  "authorName" | "height" | "openuiSource" | "prompt" | "width" | "x" | "y"
> & {
  id: string;
  exampleData: ExampleWidgetData;
};
type TemplateNoteDefinition = Pick<CanvasNote, "body" | "color" | "height" | "title" | "width" | "x" | "y"> & {
  id: string;
  authorName: string;
};

export type BoardTemplate = {
  id: string;
  name: string;
  notes: TemplateNoteDefinition[];
  widgets: TemplateWidgetDefinition[];
};

type ExampleWidgetDataInput = {
  formFields?: FormFieldData[];
  insights?: InsightData[];
  metrics?: MetricData[];
  recommendedVisualization: TemplateVisualization;
  subtitle: string;
  table?: TableData;
  timeSeries?: ExampleWidgetData["timeSeries"];
  title: string;
};

export function gridPosition(column: TemplateGridCoordinate, row: TemplateGridCoordinate) {
  const totalWidth = TEMPLATE_WIDGET_WIDTH * 3 + TEMPLATE_GAP * 2;
  const totalHeight = TEMPLATE_WIDGET_HEIGHT * 3 + TEMPLATE_GAP * 2;

  return {
    x: TEMPLATE_CANVAS_CENTER_X - totalWidth / 2 + column * (TEMPLATE_WIDGET_WIDTH + TEMPLATE_GAP),
    y: TEMPLATE_CANVAS_CENTER_Y - totalHeight / 2 + row * (TEMPLATE_WIDGET_HEIGHT + TEMPLATE_GAP),
  };
}

export function notePosition(column: TemplateGridCoordinate) {
  const totalWidth = TEMPLATE_NOTE_WIDTH * 3 + TEMPLATE_NOTE_GAP * 2;
  const totalWidgetHeight = TEMPLATE_WIDGET_HEIGHT * 3 + TEMPLATE_GAP * 2;

  return {
    x: TEMPLATE_CANVAS_CENTER_X - totalWidth / 2 + column * (TEMPLATE_NOTE_WIDTH + TEMPLATE_NOTE_GAP),
    y: TEMPLATE_CANVAS_CENTER_Y - totalWidgetHeight / 2 - TEMPLATE_NOTE_HEIGHT - TEMPLATE_NOTE_TOP_GAP,
  };
}

export function widget(
  id: string,
  prompt: string,
  position: ReturnType<typeof gridPosition>,
  exampleData: ExampleWidgetData,
): TemplateWidgetDefinition {
  return {
    id,
    authorName: TEMPLATE_AUTHOR_NAME,
    height: TEMPLATE_WIDGET_HEIGHT,
    openuiSource: openuiSourceForData(exampleData),
    prompt,
    width: TEMPLATE_WIDGET_WIDTH,
    ...position,
    exampleData,
  };
}

export function note(
  id: string,
  title: string,
  body: string,
  color: CanvasNote["color"],
  position: ReturnType<typeof notePosition>,
): TemplateNoteDefinition {
  return {
    id,
    title,
    body,
    authorName: TEMPLATE_AUTHOR_NAME,
    color,
    height: TEMPLATE_NOTE_HEIGHT,
    width: TEMPLATE_NOTE_WIDTH,
    ...position,
  };
}

function emptyTable(): TableData {
  return {
    columns: [],
    rows: [],
    title: "",
  };
}

function emptyTimeSeries(): ExampleWidgetData["timeSeries"] {
  return {
    points: [],
    projectionStartIndex: -1,
    series: [],
    title: "",
  };
}

export function exampleWidgetData(input: ExampleWidgetDataInput): ExampleWidgetData {
  return {
    dataDisclosure: PREVIEW_DISCLOSURE,
    formFields: input.formFields ?? [],
    insights: input.insights ?? [],
    metrics: input.metrics ?? [],
    recommendedVisualization: input.recommendedVisualization,
    subtitle: input.subtitle,
    table: input.table ?? emptyTable(),
    timeSeries: input.timeSeries ?? emptyTimeSeries(),
    title: input.title,
  };
}

function openuiString(value: string) {
  return JSON.stringify(value);
}

function openuiArray(values: string[]) {
  return `[${values.join(", ")}]`;
}

function metricSource(metric: MetricData) {
  return `{label: ${openuiString(metric.label)}, value: ${openuiString(metric.value)}, delta: ${openuiString(
    metric.delta,
  )}, tone: ${openuiString(metric.tone)}}`;
}

function chartPointSource(point: ChartPoint) {
  return `{label: ${openuiString(point.label)}, values: [${point.values.join(", ")}]}`;
}

function chartSeriesSource(series: ChartSeries) {
  return `{label: ${openuiString(series.label)}, tone: ${openuiString(series.tone)}}`;
}

function tableRowSource(row: TableData["rows"][number]) {
  return `{cells: ${openuiArray(row.cells.map(openuiString))}}`;
}

function insightSource(insight: InsightData) {
  return `{label: ${openuiString(insight.label)}, detail: ${openuiString(insight.detail)}, tone: ${openuiString(
    insight.tone,
  )}}`;
}

function formFieldSource(field: FormFieldData) {
  return `{label: ${openuiString(field.label)}, type: ${openuiString(field.type)}, placeholder: ${openuiString(
    field.placeholder,
  )}}`;
}

function hasChart(data: ExampleWidgetData) {
  return data.timeSeries.points.length > 0 && data.timeSeries.series.length > 0;
}

function hasTable(data: ExampleWidgetData) {
  return data.table.columns.length > 0 && data.table.rows.length > 0;
}

function metricBlockSource(blockName: string, metrics: MetricData[]) {
  return `${blockName} = MetricGrid(${openuiArray(metrics.map(metricSource))})`;
}

function chartBlockSource(blockName: string, data: ExampleWidgetData, chartType: "bar" | "line") {
  const title = openuiString(data.timeSeries.title);
  const points = openuiArray(data.timeSeries.points.map(chartPointSource));
  const series = openuiArray(data.timeSeries.series.map(chartSeriesSource));

  if (chartType === "bar") {
    return `${blockName} = BarChart(${title}, ${points}, ${series})`;
  }

  return `${blockName} = LineChart(${title}, ${points}, ${series}, ${data.timeSeries.projectionStartIndex})`;
}

function tableBlockSource(blockName: string, table: TableData) {
  return `${blockName} = DataTable(${openuiString(table.title)}, ${openuiArray(
    table.columns.map(openuiString),
  )}, ${openuiArray(table.rows.map(tableRowSource))})`;
}

function insightBlockSource(blockName: string, data: ExampleWidgetData) {
  return `${blockName} = InsightList("Key findings", ${openuiArray(data.insights.map(insightSource))})`;
}

function formBlockSource(blockName: string, data: ExampleWidgetData) {
  return `${blockName} = FormPreview(${openuiString(data.title)}, ${openuiArray(
    data.formFields.map(formFieldSource),
  )}, "Submit")`;
}

function primaryBlockSource(blockName: string, data: ExampleWidgetData) {
  if (data.recommendedVisualization === "metrics" && data.metrics.length > 0) {
    return metricBlockSource(blockName, data.metrics);
  }

  if (data.recommendedVisualization === "line_chart" && hasChart(data)) {
    return chartBlockSource(blockName, data, "line");
  }

  if (data.recommendedVisualization === "bar_chart" && hasChart(data)) {
    return chartBlockSource(blockName, data, "bar");
  }

  if (data.recommendedVisualization === "table" && hasTable(data)) {
    return tableBlockSource(blockName, data.table);
  }

  if (data.recommendedVisualization === "insights" && data.insights.length > 0) {
    return insightBlockSource(blockName, data);
  }

  if (data.recommendedVisualization === "form" && data.formFields.length > 0) {
    return formBlockSource(blockName, data);
  }

  if (data.metrics.length > 0) {
    return metricBlockSource(blockName, data.metrics);
  }

  if (hasChart(data)) {
    return chartBlockSource(blockName, data, "line");
  }

  if (hasTable(data)) {
    return tableBlockSource(blockName, data.table);
  }

  if (data.insights.length > 0) {
    return insightBlockSource(blockName, data);
  }

  return "block0 = InsightList(\"Key findings\", [])";
}

function openuiSourceForData(data: ExampleWidgetData) {
  const blockName = "block0";
  const root = `root = DashboardWidget(${openuiString(data.title)}, ${openuiString(data.subtitle)}, ${openuiString(
    data.dataDisclosure,
  )}, [${blockName}])`;

  return [root, primaryBlockSource(blockName, data)].join("\n");
}

export function createBoardFromTemplate(template: BoardTemplate, now = Date.now()): CanvasBoard {
  return {
    id: template.id,
    name: template.name,
    templateId: template.id,
    templateVersion: BOARD_TEMPLATE_VERSION,
    createdAt: now,
    notes: template.notes.map((templateNote, index) => ({
      ...templateNote,
      id: `${template.id}-${templateNote.id}`,
      createdAt: now + index,
      updatedAt: now + index,
    })),
    updatedAt: now,
    widgets: template.widgets.map((templateWidget, index) => ({
      ...templateWidget,
      id: `${template.id}-${templateWidget.id}`,
      createdAt: now + index,
      error: undefined,
      status: "done" as const,
      updatedAt: now + index,
    })),
  };
}
