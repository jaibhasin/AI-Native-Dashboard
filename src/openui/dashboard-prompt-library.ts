import { createLibrary, defineComponent, type PromptOptions } from "@openuidev/react-lang";
import { z } from "zod/v4";
import {
  chartPointSchema,
  chartSeriesSchema,
  formFieldSchema,
  insightSchema,
  metricSchema,
  tableSchema,
} from "@/lib/dashboard-schemas";

const Empty = () => null;

const MetricGrid = defineComponent({
  name: "MetricGrid",
  description: "A compact grid of KPI metric cards.",
  props: z.object({
    metrics: z.array(metricSchema),
  }),
  component: Empty,
});

const LineChart = defineComponent({
  name: "LineChart",
  description: "A line chart for trends over time or ordered categories.",
  props: z.object({
    title: z.string(),
    data: z.array(chartPointSchema),
    series: z.array(chartSeriesSchema),
    projectionStartIndex: z.number(),
  }),
  component: Empty,
});

const BarChart = defineComponent({
  name: "BarChart",
  description: "A bar chart for category or time comparisons.",
  props: z.object({
    title: z.string(),
    data: z.array(chartPointSchema),
    series: z.array(chartSeriesSchema),
  }),
  component: Empty,
});

const DataTable = defineComponent({
  name: "DataTable",
  description: "A small data table.",
  props: tableSchema,
  component: Empty,
});

const InsightList = defineComponent({
  name: "InsightList",
  description: "A short list of generated observations.",
  props: z.object({
    title: z.string(),
    items: z.array(insightSchema),
  }),
  component: Empty,
});

const FormPreview = defineComponent({
  name: "FormPreview",
  description: "A non-submitting form layout preview.",
  props: z.object({
    title: z.string(),
    fields: z.array(formFieldSchema),
    submitLabel: z.string(),
  }),
  component: Empty,
});

const DashboardBlock = z.union([
  MetricGrid.ref,
  LineChart.ref,
  BarChart.ref,
  DataTable.ref,
  InsightList.ref,
  FormPreview.ref,
]);

const DashboardWidget = defineComponent({
  name: "DashboardWidget",
  description:
    "The root container for one canvas dashboard widget. Use this as the root statement.",
  props: z.object({
    title: z.string(),
    subtitle: z.string(),
    dataDisclosure: z.string(),
    blocks: z.array(DashboardBlock),
  }),
  component: Empty,
});

export const dashboardLibrary = createLibrary({
  root: "DashboardWidget",
  components: [
    DashboardWidget,
    MetricGrid,
    LineChart,
    BarChart,
    DataTable,
    InsightList,
    FormPreview,
  ],
  componentGroups: [
    {
      name: "Dashboard",
      components: ["DashboardWidget", "MetricGrid", "LineChart", "BarChart", "DataTable", "InsightList"],
      notes: [
        "Always start with root = DashboardWidget(...).",
        "Use only values present in EXAMPLE_DATA from the user message.",
        "Prefer visual blocks: MetricGrid, LineChart, BarChart, and DataTable.",
        "For numeric dashboard requests with timeSeries data, make LineChart or BarChart the primary visual block.",
        "Use MetricGrid as the only supporting block for current values when it helps the chart.",
        "Do not add DataTable below a chart unless the user explicitly asks for a table, breakdown, list, or details.",
        "Use InsightList sparingly and never as the primary block when chart, table, or metric data is available.",
        "For chart points, each point.values array must align with the series order.",
      ],
    },
    {
      name: "Forms",
      components: ["FormPreview"],
      notes: ["Use FormPreview only for requested planning/input forms. It is not interactive in v1."],
    },
  ],
});

export const promptOptions: PromptOptions = {
  preamble:
    "You are a dashboard UI generator. Output only valid OpenUI Lang for one compact canvas widget.",
  toolCalls: false,
  bindings: false,
  additionalRules: [
    "Return OpenUI Lang only. Do not use markdown, prose, code fences, JSON, HTML, CSS, or comments.",
    "The first renderable statement must be root = DashboardWidget(...).",
    "Use only components in the provided library.",
    "Do not use Query(), Mutation(), @Run, variables, external tools, or runtime data bindings.",
    "Do not invent numbers, labels, or facts outside EXAMPLE_DATA.",
    "Always include the EXAMPLE_DATA.dataDisclosure in DashboardWidget.",
    "Make widgets mostly visual and graph-first for numeric dashboard requests.",
    "If EXAMPLE_DATA.timeSeries.points has at least 2 points, include LineChart or BarChart as the primary visual block.",
    "For current spend, runway left, MRR, burn, cash balance, retention, conversion, usage, support, and pipeline requests, use MetricGrid plus a chart when timeSeries data is available.",
    "For explicit graph/chart requests, use just LineChart or BarChart unless current KPI cards are essential.",
    "Do not add DataTable unless the user explicitly asks for a table, breakdown, list, or details.",
    "Use at most two blocks: MetricGrid plus LineChart/BarChart, or just LineChart/BarChart for graph requests.",
    "Do not make text-heavy widgets. Keep narrative blocks rare, short, and secondary.",
    "Prefer a compact layout that fits inside a 440 by 320 canvas widget.",
  ],
  examples: [
    'root = DashboardWidget("Team activity", "Past 7 days", "Preview data generated by AI.", [metrics, chart])\nmetrics = MetricGrid([{label: "Active employees", value: "18", delta: "+3 vs prior week", tone: "positive"}, {label: "Open tasks", value: "42", delta: "-8 vs prior week", tone: "positive"}])\nchart = BarChart("Work by function", [{label: "Eng", values: [18]}, {label: "Sales", values: [11]}, {label: "Ops", values: [7]}], [{label: "Tasks", tone: "neutral"}])',
    'root = DashboardWidget("Burn rate", "Last 2 months", "Preview data generated by AI.", [metrics, chart])\nmetrics = MetricGrid([{label: "Net burn", value: "$218k/mo", delta: "+9.5% vs Apr", tone: "warning"}, {label: "Runway", value: "8.3 mo", delta: "-0.8 mo", tone: "warning"}])\nchart = LineChart("Monthly burn", [{label: "Apr", values: [199]}, {label: "May", values: [218]}], [{label: "Net burn", tone: "warning"}], -1)',
    'root = DashboardWidget("Runway left", "Current estimate", "Preview data generated by AI.", [metrics, chart])\nmetrics = MetricGrid([{label: "Runway left", value: "8.3 mo", delta: "At current burn", tone: "warning"}, {label: "Cash balance", value: "$1.82M", delta: "Latest close", tone: "neutral"}])\nchart = LineChart("Runway trend", [{label: "Mar", values: [10.1]}, {label: "Apr", values: [9.4]}, {label: "May", values: [8.8]}, {label: "Jun", values: [8.3]}], [{label: "Months left", tone: "warning"}], -1)',
  ],
};

export const library = dashboardLibrary;
