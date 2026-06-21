import type {
  CanvasBoard,
  CanvasNote,
  CanvasWidget,
  ChartPoint,
  ChartSeries,
  ExampleWidgetData,
  FormFieldData,
  FunnelData,
  FunnelStepData,
  GaugeData,
  InsightData,
  MetricData,
  MilestoneItemData,
  MilestonesData,
  DonutData,
  DonutSegmentData,
  RankingData,
  RankingItemData,
  TableData,
} from "@/lib/dashboard-schemas";
import { TEMPLATE_AUTHOR_NAME } from "@/lib/dashboard-schemas";
import { planWidgetAnnotations, type WidgetAnnotationSupplement } from "@/lib/board-template-annotations";

export const BLANK_BOARD_ID = "blank";
// Increment when prebuilt template content/layout changes. On load, every board in
// BOARD_TEMPLATES (Founder, Engineering, Sales, Ops) is replaced if its stored
// templateVersion does not match — personal boards are untouched.
export const BOARD_TEMPLATE_VERSION = 14;
export const TEMPLATE_DISCLOSURE = "AI-generated preview data.";

const TEMPLATE_WIDGET_WIDTH = 440;
const TEMPLATE_WIDGET_HEIGHT = 320;
const TEMPLATE_NOTE_HEIGHT = 120;
const TEMPLATE_CLUSTER_NOTE_WIDTH = 220;
const TEMPLATE_CLUSTER_NOTE_HEIGHT = 90;
const TEMPLATE_CLUSTER_TOP_NOTE_WIDTH = 360;
const TEMPLATE_CLUSTER_PADDING = 24;
const TEMPLATE_CLUSTER_GAP = 48;
export const FOUNDER_HERO_ROW_HEIGHT = 360;
const TEMPLATE_CANVAS_CENTER_X = 100000;
const TEMPLATE_CANVAS_CENTER_Y = 100000;
const TEMPLATE_GAP = 36;
const TEMPLATE_NOTE_ROW_GAP = 16;
const TEMPLATE_NOTE_TOP_GAP = 28;

export type TemplateGridCoordinate = 0 | 1 | 2;
type TemplateVisualization = ExampleWidgetData["recommendedVisualization"];
type TemplateWidgetDefinition = Pick<
  CanvasWidget,
  "authorName" | "height" | "openuiSource" | "prompt" | "width" | "x" | "y"
> & {
  id: string;
  exampleData: ExampleWidgetData;
};
type TemplateNoteDefinition = Pick<
  CanvasNote,
  "body" | "color" | "height" | "title" | "width" | "widgetId" | "x" | "y"
> & {
  id: string;
  authorName: string;
};

export type BoardTemplate = {
  id: string;
  name: string;
  notes: TemplateNoteDefinition[];
  widgets: TemplateWidgetDefinition[];
};

export type { WidgetAnnotationSupplement } from "@/lib/board-template-annotations";

export type WidgetNotePlacement = "top" | "left" | "right" | "bottom";

export type WidgetNoteSpec = {
  body: string;
  color: CanvasNote["color"];
  placement: WidgetNotePlacement;
  title: string;
};

export type WidgetCluster = {
  notes: TemplateNoteDefinition[];
  widget: TemplateWidgetDefinition;
};

type ExampleWidgetDataInput = {
  disclosure?: string;
  formFields?: FormFieldData[];
  funnel?: FunnelData;
  gauges?: GaugeData[];
  insights?: InsightData[];
  metrics?: MetricData[];
  milestones?: MilestonesData;
  donut?: DonutData;
  ranking?: RankingData;
  recommendedVisualization: TemplateVisualization;
  subtitle: string;
  table?: TableData;
  timeSeries?: ExampleWidgetData["timeSeries"];
  title: string;
};

type GridSpanPosition = {
  height: number;
  width: number;
  x: number;
  y: number;
};

const FOUNDER_ROW_HEIGHTS: [number, number, number] = [
  FOUNDER_HERO_ROW_HEIGHT,
  TEMPLATE_WIDGET_HEIGHT,
  TEMPLATE_WIDGET_HEIGHT,
];

export function gridPosition(column: TemplateGridCoordinate, row: TemplateGridCoordinate) {
  const totalWidth = TEMPLATE_WIDGET_WIDTH * 3 + TEMPLATE_GAP * 2;
  const totalHeight = TEMPLATE_WIDGET_HEIGHT * 3 + TEMPLATE_GAP * 2;

  return {
    x: TEMPLATE_CANVAS_CENTER_X - totalWidth / 2 + column * (TEMPLATE_WIDGET_WIDTH + TEMPLATE_GAP),
    y: TEMPLATE_CANVAS_CENTER_Y - totalHeight / 2 + row * (TEMPLATE_WIDGET_HEIGHT + TEMPLATE_GAP),
  };
}

function gridTotalHeight(rowHeights: number[]) {
  return rowHeights.reduce((sum, height, index) => sum + height + (index < rowHeights.length - 1 ? TEMPLATE_GAP : 0), 0);
}

function gridRowOffset(rowHeights: number[], row: number) {
  let offset = 0;

  for (let index = 0; index < row; index += 1) {
    offset += rowHeights[index] + TEMPLATE_GAP;
  }

  return offset;
}

function spanHeight(rowHeights: number[], row: number, rowSpan: number) {
  return rowHeights
    .slice(row, row + rowSpan)
    .reduce((sum, height, index) => sum + height + (index < rowSpan - 1 ? TEMPLATE_GAP : 0), 0);
}

export function gridPositionSpan(
  column: TemplateGridCoordinate,
  row: TemplateGridCoordinate,
  colSpan: 1 | 2 | 3 = 1,
  rowSpan: 1 | 2 | 3 = 1,
  rowHeights: number[] = FOUNDER_ROW_HEIGHTS,
): GridSpanPosition {
  const totalWidth = TEMPLATE_WIDGET_WIDTH * 3 + TEMPLATE_GAP * 2;
  const totalHeight = gridTotalHeight(rowHeights);
  const width = colSpan * TEMPLATE_WIDGET_WIDTH + (colSpan - 1) * TEMPLATE_GAP;
  const height = spanHeight(rowHeights, row, rowSpan);

  return {
    x: TEMPLATE_CANVAS_CENTER_X - totalWidth / 2 + column * (TEMPLATE_WIDGET_WIDTH + TEMPLATE_GAP),
    y: TEMPLATE_CANVAS_CENTER_Y - totalHeight / 2 + gridRowOffset(rowHeights, row),
    width,
    height,
  };
}

function standardWidgetGridHeight() {
  return TEMPLATE_WIDGET_HEIGHT * 3 + TEMPLATE_GAP * 2;
}

function noteColumnX(column: TemplateGridCoordinate, colSpan: 1 | 2 | 3 = 1) {
  const totalWidth = TEMPLATE_WIDGET_WIDTH * 3 + TEMPLATE_GAP * 2;

  return {
    totalWidth,
    width: colSpan * TEMPLATE_WIDGET_WIDTH + (colSpan - 1) * TEMPLATE_GAP,
    x: TEMPLATE_CANVAS_CENTER_X - totalWidth / 2 + column * (TEMPLATE_WIDGET_WIDTH + TEMPLATE_GAP),
  };
}

function noteYAboveGrid(totalWidgetHeight: number, noteRowFromWidgets: number) {
  const noteBlockHeight = TEMPLATE_NOTE_HEIGHT + TEMPLATE_NOTE_ROW_GAP;

  return (
    TEMPLATE_CANVAS_CENTER_Y -
    totalWidgetHeight / 2 -
    TEMPLATE_NOTE_TOP_GAP -
    TEMPLATE_NOTE_HEIGHT -
    noteRowFromWidgets * noteBlockHeight
  );
}

export function notePosition(column: TemplateGridCoordinate) {
  const { x } = noteColumnX(column);

  return {
    x,
    y: noteYAboveGrid(standardWidgetGridHeight(), 0),
  };
}

export function notePositionSpan(column: TemplateGridCoordinate, colSpan: 1 | 2 | 3 = 1, noteRowFromWidgets = 0) {
  const { x, width } = noteColumnX(column, colSpan);

  return {
    x,
    y: noteYAboveGrid(standardWidgetGridHeight(), noteRowFromWidgets),
    width,
  };
}

export function founderNotePositionSpan(
  column: TemplateGridCoordinate,
  colSpan: 1 | 2 | 3 = 1,
  noteRowFromWidgets = 0,
) {
  const { x, width } = noteColumnX(column, colSpan);
  const totalWidgetHeight = gridTotalHeight(FOUNDER_ROW_HEIGHTS);

  return {
    x,
    y: noteYAboveGrid(totalWidgetHeight, noteRowFromWidgets),
    width,
  };
}

function clusterCellSize(widgetWidth = TEMPLATE_WIDGET_WIDTH, widgetHeight = TEMPLATE_WIDGET_HEIGHT) {
  return {
    height:
      TEMPLATE_CLUSTER_NOTE_HEIGHT +
      TEMPLATE_CLUSTER_PADDING +
      widgetHeight +
      TEMPLATE_CLUSTER_PADDING +
      TEMPLATE_CLUSTER_NOTE_HEIGHT,
    width:
      TEMPLATE_CLUSTER_NOTE_WIDTH +
      TEMPLATE_CLUSTER_PADDING +
      widgetWidth +
      TEMPLATE_CLUSTER_PADDING +
      TEMPLATE_CLUSTER_NOTE_WIDTH,
  };
}

function clusterGridOrigin(
  cols: number,
  rows: number,
  cellWidth: number,
  cellHeight: number,
  rowHeights?: number[],
) {
  const totalWidth = cols * cellWidth + Math.max(0, cols - 1) * TEMPLATE_CLUSTER_GAP;
  const totalHeight = rowHeights
    ? rowHeights.reduce((sum, height, index) => sum + height + (index < rowHeights.length - 1 ? TEMPLATE_CLUSTER_GAP : 0), 0)
    : rows * cellHeight + Math.max(0, rows - 1) * TEMPLATE_CLUSTER_GAP;

  return {
    left: TEMPLATE_CANVAS_CENTER_X - totalWidth / 2,
    top: TEMPLATE_CANVAS_CENTER_Y - totalHeight / 2,
    totalHeight,
    totalWidth,
  };
}

export function widgetRectInCluster(
  clusterOrigin: { x: number; y: number },
  widgetWidth = TEMPLATE_WIDGET_WIDTH,
  widgetHeight = TEMPLATE_WIDGET_HEIGHT,
): GridSpanPosition {
  return {
    height: widgetHeight,
    width: widgetWidth,
    x: clusterOrigin.x + TEMPLATE_CLUSTER_NOTE_WIDTH + TEMPLATE_CLUSTER_PADDING,
    y: clusterOrigin.y + TEMPLATE_CLUSTER_NOTE_HEIGHT + TEMPLATE_CLUSTER_PADDING,
  };
}

export function widgetClusterPosition(
  column: number,
  row: number,
  cols = 3,
  rows = 3,
  widgetWidth = TEMPLATE_WIDGET_WIDTH,
  widgetHeight = TEMPLATE_WIDGET_HEIGHT,
) {
  const cell = clusterCellSize(widgetWidth, widgetHeight);
  const origin = clusterGridOrigin(cols, rows, cell.width, cell.height);

  return widgetRectInCluster(
    {
      x: origin.left + column * (cell.width + TEMPLATE_CLUSTER_GAP),
      y: origin.top + row * (cell.height + TEMPLATE_CLUSTER_GAP),
    },
    widgetWidth,
    widgetHeight,
  );
}

export function notesAroundWidget(
  widgetId: string,
  widgetRect: GridSpanPosition,
  specs: WidgetNoteSpec[],
): TemplateNoteDefinition[] {
  return specs.map((spec) => {
    const noteId = `${widgetId}-${spec.placement}`;
    let position = { height: TEMPLATE_CLUSTER_NOTE_HEIGHT, width: TEMPLATE_CLUSTER_NOTE_WIDTH, x: widgetRect.x, y: widgetRect.y };

    if (spec.placement === "top") {
      position = {
        height: TEMPLATE_CLUSTER_NOTE_HEIGHT,
        width: Math.min(TEMPLATE_CLUSTER_TOP_NOTE_WIDTH, widgetRect.width),
        x: Math.round(widgetRect.x + (widgetRect.width - Math.min(TEMPLATE_CLUSTER_TOP_NOTE_WIDTH, widgetRect.width)) / 2),
        y: Math.round(widgetRect.y - TEMPLATE_CLUSTER_PADDING - TEMPLATE_CLUSTER_NOTE_HEIGHT),
      };
    }

    if (spec.placement === "bottom") {
      position = {
        height: TEMPLATE_CLUSTER_NOTE_HEIGHT,
        width: Math.min(TEMPLATE_CLUSTER_TOP_NOTE_WIDTH, widgetRect.width),
        x: Math.round(widgetRect.x + (widgetRect.width - Math.min(TEMPLATE_CLUSTER_TOP_NOTE_WIDTH, widgetRect.width)) / 2),
        y: Math.round(widgetRect.y + widgetRect.height + TEMPLATE_CLUSTER_PADDING),
      };
    }

    if (spec.placement === "left") {
      position = {
        height: TEMPLATE_CLUSTER_NOTE_HEIGHT,
        width: TEMPLATE_CLUSTER_NOTE_WIDTH,
        x: Math.round(widgetRect.x - TEMPLATE_CLUSTER_PADDING - TEMPLATE_CLUSTER_NOTE_WIDTH),
        y: Math.round(widgetRect.y + (widgetRect.height - TEMPLATE_CLUSTER_NOTE_HEIGHT) / 2),
      };
    }

    if (spec.placement === "right") {
      position = {
        height: TEMPLATE_CLUSTER_NOTE_HEIGHT,
        width: TEMPLATE_CLUSTER_NOTE_WIDTH,
        x: Math.round(widgetRect.x + widgetRect.width + TEMPLATE_CLUSTER_PADDING),
        y: Math.round(widgetRect.y + (widgetRect.height - TEMPLATE_CLUSTER_NOTE_HEIGHT) / 2),
      };
    }

    return {
      ...noteSized(noteId, spec.title, spec.body, spec.color, position),
      widgetId,
    };
  });
}

export function buildWidgetCluster(
  id: string,
  prompt: string,
  column: number,
  row: number,
  exampleData: ExampleWidgetData,
  supplements?: WidgetAnnotationSupplement[],
  grid?: { cols?: number; rows?: number; widgetHeight?: number; widgetWidth?: number },
): WidgetCluster {
  const widgetRect = widgetClusterPosition(
    column,
    row,
    grid?.cols ?? 3,
    grid?.rows ?? 3,
    grid?.widgetWidth ?? TEMPLATE_WIDGET_WIDTH,
    grid?.widgetHeight ?? TEMPLATE_WIDGET_HEIGHT,
  );

  return buildWidgetClusterFromRect(id, prompt, widgetRect, exampleData, supplements);
}

export function buildWidgetClusterFromRect(
  id: string,
  prompt: string,
  widgetRect: GridSpanPosition,
  exampleData: ExampleWidgetData,
  supplements?: WidgetAnnotationSupplement[],
  openuiSource?: string,
): WidgetCluster {
  const noteSpecs = planWidgetAnnotations(prompt, exampleData, supplements);

  return {
    notes: notesAroundWidget(id, widgetRect, noteSpecs),
    widget: widgetSizedWithSource(id, prompt, widgetRect, exampleData, openuiSource),
  };
}

export function flattenClusters(clusters: WidgetCluster[]) {
  return {
    notes: clusters.flatMap((cluster) => cluster.notes),
    widgets: clusters.map((cluster) => cluster.widget),
  };
}

export function founderHeroClusterPositions() {
  const runwayWidth = TEMPLATE_WIDGET_WIDTH * 2 + TEMPLATE_GAP;
  const runwayCell = clusterCellSize(runwayWidth, FOUNDER_HERO_ROW_HEIGHT);
  const arrCell = clusterCellSize(TEMPLATE_WIDGET_WIDTH, FOUNDER_HERO_ROW_HEIGHT);
  const standardCell = clusterCellSize();
  const row0Width = runwayCell.width + TEMPLATE_CLUSTER_GAP + arrCell.width;
  const row0Left = TEMPLATE_CANVAS_CENTER_X - row0Width / 2;
  const row0Top = TEMPLATE_CANVAS_CENTER_Y - (runwayCell.height + TEMPLATE_CLUSTER_GAP + standardCell.height * 2 + TEMPLATE_CLUSTER_GAP) / 2;
  const row1Top = row0Top + runwayCell.height + TEMPLATE_CLUSTER_GAP;
  const row2Top = row1Top + standardCell.height + TEMPLATE_CLUSTER_GAP;
  const row1Width = standardCell.width * 3 + TEMPLATE_CLUSTER_GAP * 2;
  const row1Left = TEMPLATE_CANVAS_CENTER_X - row1Width / 2;

  return {
    arr: widgetRectInCluster({ x: row0Left + runwayCell.width + TEMPLATE_CLUSTER_GAP, y: row0Top }, TEMPLATE_WIDGET_WIDTH, FOUNDER_HERO_ROW_HEIGHT),
    efficiency: widgetRectInCluster({ x: row1Left, y: row1Top }),
    customerRisk: widgetRectInCluster({ x: row1Left + standardCell.width + TEMPLATE_CLUSTER_GAP, y: row1Top }),
    activation: widgetRectInCluster({ x: row1Left + (standardCell.width + TEMPLATE_CLUSTER_GAP) * 2, y: row1Top }),
    grossMargin: widgetRectInCluster({ x: row1Left, y: row2Top }),
    fundraising: widgetRectInCluster({ x: row1Left + standardCell.width + TEMPLATE_CLUSTER_GAP, y: row2Top }),
    priorities: widgetRectInCluster({ x: row1Left + (standardCell.width + TEMPLATE_CLUSTER_GAP) * 2, y: row2Top }),
    runway: widgetRectInCluster({ x: row0Left, y: row0Top }, runwayWidth, FOUNDER_HERO_ROW_HEIGHT),
  };
}

export function widget(
  id: string,
  prompt: string,
  position: ReturnType<typeof gridPosition>,
  exampleData: ExampleWidgetData,
): TemplateWidgetDefinition {
  return widgetSized(id, prompt, { ...position, height: TEMPLATE_WIDGET_HEIGHT, width: TEMPLATE_WIDGET_WIDTH }, exampleData);
}

export function widgetSized(
  id: string,
  prompt: string,
  position: GridSpanPosition,
  exampleData: ExampleWidgetData,
): TemplateWidgetDefinition {
  return widgetSizedWithSource(id, prompt, position, exampleData);
}

export function widgetSizedWithSource(
  id: string,
  prompt: string,
  position: GridSpanPosition,
  exampleData: ExampleWidgetData,
  openuiSource?: string,
): TemplateWidgetDefinition {
  return {
    id,
    authorName: TEMPLATE_AUTHOR_NAME,
    height: position.height,
    openuiSource: openuiSource ?? openuiSourceForData(exampleData),
    prompt,
    width: position.width,
    x: position.x,
    y: position.y,
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
  return noteSized(id, title, body, color, {
    ...position,
    height: TEMPLATE_NOTE_HEIGHT,
    width: TEMPLATE_WIDGET_WIDTH,
  });
}

export function noteSized(
  id: string,
  title: string,
  body: string,
  color: CanvasNote["color"],
  position: { height: number; width: number; x: number; y: number },
): TemplateNoteDefinition {
  return {
    id,
    title,
    body,
    authorName: TEMPLATE_AUTHOR_NAME,
    color,
    height: position.height,
    width: position.width,
    x: position.x,
    y: position.y,
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

function emptyFunnel(): FunnelData {
  return {
    steps: [],
    title: "",
  };
}

function emptyRanking(): RankingData {
  return {
    items: [],
    title: "",
  };
}

function emptyMilestones(): MilestonesData {
  return {
    items: [],
    title: "",
  };
}

function emptyDonut(): DonutData {
  return {
    segments: [],
    title: "",
  };
}

export function exampleWidgetData(input: ExampleWidgetDataInput): ExampleWidgetData {
  return {
    dataDisclosure: input.disclosure ?? TEMPLATE_DISCLOSURE,
    donut: input.donut ?? emptyDonut(),
    formFields: input.formFields ?? [],
    funnel: input.funnel ?? emptyFunnel(),
    gauges: input.gauges ?? [],
    insights: input.insights ?? [],
    metrics: input.metrics ?? [],
    milestones: input.milestones ?? emptyMilestones(),
    ranking: input.ranking ?? emptyRanking(),
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

function hasFunnel(data: ExampleWidgetData) {
  return data.funnel.steps.length > 0;
}

function hasGauges(data: ExampleWidgetData) {
  return data.gauges.length > 0;
}

function hasRanking(data: ExampleWidgetData) {
  return data.ranking.items.length > 0;
}

function hasMilestones(data: ExampleWidgetData) {
  return data.milestones.items.length > 0;
}

function hasDonut(data: ExampleWidgetData) {
  return data.donut.segments.length > 0;
}

function funnelStepSource(step: FunnelStepData) {
  return `{label: ${openuiString(step.label)}, value: ${step.value}, dropoff: ${openuiString(step.dropoff)}, tone: ${openuiString(step.tone)}}`;
}

function gaugeSource(gauge: GaugeData) {
  return `{label: ${openuiString(gauge.label)}, value: ${gauge.value}, target: ${gauge.target}, unit: ${openuiString(gauge.unit)}, tone: ${openuiString(gauge.tone)}}`;
}

function rankingItemSource(item: RankingItemData) {
  return `{label: ${openuiString(item.label)}, value: ${openuiString(item.value)}, detail: ${openuiString(item.detail)}, badge: ${openuiString(item.badge)}, tone: ${openuiString(item.tone)}}`;
}

function milestoneItemSource(item: MilestoneItemData) {
  return `{label: ${openuiString(item.label)}, detail: ${openuiString(item.detail)}, status: ${openuiString(item.status)}}`;
}

function donutSegmentSource(segment: DonutSegmentData) {
  return `{label: ${openuiString(segment.label)}, value: ${segment.value}, tone: ${openuiString(segment.tone)}}`;
}

function donutBlockSource(blockName: string, donut: DonutData) {
  return `${blockName} = DonutChart(${openuiString(donut.title)}, ${openuiArray(donut.segments.map(donutSegmentSource))})`;
}

function statHeroBlockSource(blockName: string, data: ExampleWidgetData) {
  const metric = data.metrics[0] ?? { label: "Metric", value: "0", delta: "", tone: "neutral" as const };
  const title = openuiString(data.timeSeries.title);
  const points = openuiArray(data.timeSeries.points.map(chartPointSource));
  const series = openuiArray(data.timeSeries.series.map(chartSeriesSource));

  return `${blockName} = StatHero(${metricSource(metric)}, ${title}, ${points}, ${series}, ${data.timeSeries.projectionStartIndex})`;
}

function funnelBlockSource(blockName: string, funnel: FunnelData) {
  return `${blockName} = FunnelSteps(${openuiString(funnel.title)}, ${openuiArray(funnel.steps.map(funnelStepSource))})`;
}

function gaugeBlockSource(blockName: string, gauges: GaugeData[]) {
  return `${blockName} = ProgressGauge(${openuiArray(gauges.map(gaugeSource))})`;
}

function rankingBlockSource(blockName: string, ranking: RankingData) {
  return `${blockName} = RankedList(${openuiString(ranking.title)}, ${openuiArray(ranking.items.map(rankingItemSource))})`;
}

function milestoneBlockSource(blockName: string, milestones: MilestonesData) {
  return `${blockName} = MilestoneTracker(${openuiString(milestones.title)}, ${openuiArray(milestones.items.map(milestoneItemSource))})`;
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
  if (data.recommendedVisualization === "stat" && data.metrics.length > 0) {
    return statHeroBlockSource(blockName, data);
  }

  if (data.recommendedVisualization === "funnel" && hasFunnel(data)) {
    return funnelBlockSource(blockName, data.funnel);
  }

  if (data.recommendedVisualization === "gauge" && hasGauges(data)) {
    return gaugeBlockSource(blockName, data.gauges);
  }

  if (data.recommendedVisualization === "ranking" && hasRanking(data)) {
    return rankingBlockSource(blockName, data.ranking);
  }

  if (data.recommendedVisualization === "timeline" && hasMilestones(data)) {
    return milestoneBlockSource(blockName, data.milestones);
  }

  if (data.recommendedVisualization === "donut_chart" && hasDonut(data)) {
    return donutBlockSource(blockName, data.donut);
  }

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

function compositeBlocksSource(data: ExampleWidgetData) {
  const blocks: string[] = [];
  const names: string[] = [];
  let index = 0;

  if (data.metrics.length > 0 && hasChart(data) && data.recommendedVisualization === "composite") {
    const heroName = `block${index}`;
    blocks.push(statHeroBlockSource(heroName, data));
    names.push(heroName);
    index += 1;

    if (data.metrics.length > 1) {
      const metricsName = `block${index}`;
      blocks.push(metricBlockSource(metricsName, data.metrics.slice(1)));
      names.push(metricsName);
      index += 1;
    }

    return { blockSources: blocks, blockNames: names };
  }

  if (data.metrics.length > 0) {
    const blockName = `block${index}`;
    blocks.push(metricBlockSource(blockName, data.metrics));
    names.push(blockName);
    index += 1;
  }

  if (hasChart(data)) {
    const blockName = `block${index}`;
    const chartType =
      data.recommendedVisualization === "bar_chart" ||
      (data.recommendedVisualization === "composite" && data.timeSeries.title.toLowerCase().includes("funnel"))
        ? "bar"
        : "line";
    blocks.push(chartBlockSource(blockName, data, chartType));
    names.push(blockName);
    index += 1;
  }

  if (hasDonut(data)) {
    const blockName = `block${index}`;
    blocks.push(donutBlockSource(blockName, data.donut));
    names.push(blockName);
    index += 1;
  }

  if (hasTable(data)) {
    const blockName = `block${index}`;
    blocks.push(tableBlockSource(blockName, data.table));
    names.push(blockName);
    index += 1;
  }

  if (data.insights.length > 0) {
    const blockName = `block${index}`;
    blocks.push(insightBlockSource(blockName, data));
    names.push(blockName);
  }

  return { blockSources: blocks, blockNames: names };
}

function blocksSourceForData(data: ExampleWidgetData) {
  if (data.recommendedVisualization === "composite") {
    const composite = compositeBlocksSource(data);

    if (composite.blockNames.length > 0) {
      return composite;
    }
  }

  const blockName = "block0";

  return {
    blockNames: [blockName],
    blockSources: [primaryBlockSource(blockName, data)],
  };
}

export function openuiSourceForData(data: ExampleWidgetData) {
  const { blockNames, blockSources } = blocksSourceForData(data);
  const root = `root = DashboardWidget(${openuiString(data.title)}, ${openuiString(data.subtitle)}, ${openuiString(
    data.dataDisclosure,
  )}, [${blockNames.join(", ")}])`;

  return [...blockSources, root].join("\n");
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
      widgetId: templateNote.widgetId ? `${template.id}-${templateNote.widgetId}` : undefined,
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
