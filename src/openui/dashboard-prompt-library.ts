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
      components: ["DashboardWidget", "MetricGrid", "LineChart", "BarChart", "DataTable", "InsightList", "FormPreview"],
      notes: [
        "Always start with root = DashboardWidget(...).",
        "Use only values present in EXAMPLE_DATA from the user message.",
        "Choose the block stack from USER_PROMPT and EXAMPLE_DATA.recommendedVisualization instead of using one default layout.",
        "Use MetricGrid for KPI, scorecard, current value, or snapshot requests.",
        "Use LineChart or BarChart for trend, forecast, comparison, graph, or chart requests.",
        "Use DataTable as the primary block for table, list, breakdown, details, or by-segment requests.",
        "Use InsightList as the primary block for analysis, why, recommendation, risk, anomaly, or opportunity requests.",
        "Use FormPreview as the primary block for requested forms, inputs, planners, or calculators.",
        "For composite requests, combine two or three complementary blocks such as MetricGrid plus DataTable, chart plus InsightList, or MetricGrid plus chart.",
        "For runway left requests, chart future months against cash remaining or money left; do not chart burn, spend, or money spent.",
        "Do not put MetricGrid before every widget. Add it only when current metrics help answer the prompt.",
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
    "Keep narrative blocks concise.",
    "Prefer a compact layout that fits inside a 440 by 320 canvas widget.",
  ],
  examples: [
    'root = DashboardWidget("Team activity", "Past 7 days", "Preview data generated by AI.", [metrics, chart])\nmetrics = MetricGrid([{label: "Active employees", value: "18", delta: "+3 vs prior week", tone: "positive"}, {label: "Open tasks", value: "42", delta: "-8 vs prior week", tone: "positive"}])\nchart = BarChart("Work by function", [{label: "Eng", values: [18]}, {label: "Sales", values: [11]}, {label: "Ops", values: [7]}], [{label: "Tasks", tone: "neutral"}])',
    'root = DashboardWidget("Model spend breakdown", "Current month by provider", "Preview data generated by AI.", [table])\ntable = DataTable("Spend by model", ["Model", "Calls", "Spend", "Waste"], [{cells: ["GPT-5.5", "41.2k", "$18.4k", "9.6%"]}, {cells: ["Claude Sonnet", "28.9k", "$12.1k", "7.8%"]}, {cells: ["Llama 3.3", "63.4k", "$4.7k", "14.1%"]}])',
    'root = DashboardWidget("Retry cost risks", "Where failures are concentrating", "Preview data generated by AI.", [insights])\ninsights = InsightList("Top findings", [{label: "Tool timeouts dominate", detail: "Search and billing lookups create most retry spend.", tone: "warning"}, {label: "Routing improved quality", detail: "Low-risk tasks moved to cheaper models without reducing eval pass rate.", tone: "positive"}])',
    'root = DashboardWidget("Budget scenario", "Inputs for a model-spend forecast", "Preview data generated by AI.", [form])\nform = FormPreview("Scenario inputs", [{label: "Monthly runs", type: "number", placeholder: "185000"}, {label: "Target waste rate", type: "number", placeholder: "12%"}, {label: "Review date", type: "date", placeholder: "2026-07-01"}], "Preview scenario")',
  ],
};

export const library = dashboardLibrary;
