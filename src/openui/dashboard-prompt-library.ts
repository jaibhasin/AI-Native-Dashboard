import { createLibrary, defineComponent, type PromptOptions } from "@openuidev/react-lang";
import { z } from "zod/v4";
import {
  chartPointSchema,
  chartSeriesSchema,
  donutSegmentSchema,
  formFieldSchema,
  funnelStepSchema,
  gaugeSchema,
  insightSchema,
  metricSchema,
  milestoneItemSchema,
  rankingItemSchema,
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

const StatHero = defineComponent({
  name: "StatHero",
  description: "A headline KPI with delta and inline sparkline trend.",
  props: z.object({
    metric: metricSchema,
    title: z.string(),
    data: z.array(chartPointSchema),
    series: z.array(chartSeriesSchema),
    projectionStartIndex: z.number(),
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

const FunnelSteps = defineComponent({
  name: "FunnelSteps",
  description: "A conversion funnel with stage counts and drop-off percentages.",
  props: z.object({
    title: z.string(),
    steps: z.array(funnelStepSchema),
  }),
  component: Empty,
});

const ProgressGauge = defineComponent({
  name: "ProgressGauge",
  description: "One to three value-vs-target progress gauges.",
  props: z.object({
    gauges: z.array(gaugeSchema),
  }),
  component: Empty,
});

const RankedList = defineComponent({
  name: "RankedList",
  description: "A ranked list with proportional bars and optional badges.",
  props: z.object({
    title: z.string(),
    items: z.array(rankingItemSchema),
  }),
  component: Empty,
});

const MilestoneTracker = defineComponent({
  name: "MilestoneTracker",
  description: "A milestone timeline with done, active, blocked, and todo states.",
  props: z.object({
    title: z.string(),
    items: z.array(milestoneItemSchema),
  }),
  component: Empty,
});

const DonutChart = defineComponent({
  name: "DonutChart",
  description: "A donut chart for part-to-whole splits such as AI-assisted vs human-written code.",
  props: z.object({
    title: z.string(),
    segments: z.array(donutSegmentSchema),
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
  StatHero.ref,
  LineChart.ref,
  BarChart.ref,
  FunnelSteps.ref,
  ProgressGauge.ref,
  RankedList.ref,
  MilestoneTracker.ref,
  DonutChart.ref,
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
    StatHero,
    LineChart,
    BarChart,
    FunnelSteps,
    ProgressGauge,
    RankedList,
    MilestoneTracker,
    DonutChart,
    DataTable,
    InsightList,
    FormPreview,
  ],
  componentGroups: [
    {
      name: "Dashboard",
      components: [
        "DashboardWidget",
        "MetricGrid",
        "StatHero",
        "LineChart",
        "BarChart",
        "FunnelSteps",
        "ProgressGauge",
        "RankedList",
        "MilestoneTracker",
        "DonutChart",
        "DataTable",
        "InsightList",
        "FormPreview",
      ],
      notes: [
        "Always start with root = DashboardWidget(...).",
        "Use only values present in EXAMPLE_DATA from the user message.",
        "Choose the block from USER_PROMPT and EXAMPLE_DATA.recommendedVisualization instead of defaulting to MetricGrid or DataTable.",
        "Use StatHero when one number is the headline and a sparkline trend helps.",
        "Use FunnelSteps for conversion, funnel, activation, or drop-off prompts instead of BarChart.",
        "Use ProgressGauge for value-vs-target, utilization, margin-vs-goal, or efficiency prompts.",
        "Use RankedList for top-N, leaderboard, concentration, or account exposure prompts instead of a plain table.",
        "Use MilestoneTracker for readiness, roadmap, diligence, milestone, or status prompts.",
        "Use DonutChart for part-to-whole splits such as AI vs human contribution, share mix, or category composition.",
        "Use MetricGrid only for multi-KPI scorecards with no single headline number.",
        "Use LineChart or BarChart for trend, forecast, comparison, graph, or chart requests.",
        "Use DataTable for task lists, owner tables, or multi-column operational lists.",
        "Use InsightList for analysis, why, recommendation, risk, anomaly, or opportunity requests.",
        "Use FormPreview for requested forms, inputs, planners, or calculators.",
        "For composite requests, combine two complementary blocks such as StatHero plus MetricGrid, chart plus InsightList, or ProgressGauge plus RankedList.",
        "For runway left requests, chart future months against cash remaining or money left; do not chart burn, spend, or money spent.",
        "Do not use MetricGrid on every widget. Prefer varied blocks across a board.",
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
    "Use StatHero when EXAMPLE_DATA.recommendedVisualization is stat or one metric is clearly the headline.",
    "Use FunnelSteps when recommendedVisualization is funnel or the prompt asks for conversion, activation, or drop-off.",
    "Use ProgressGauge when recommendedVisualization is gauge or the prompt asks for value-vs-target, utilization, or margin-vs-goal.",
    "Use RankedList when recommendedVisualization is ranking or the prompt asks for top accounts, leaderboard, or concentration.",
    "Use MilestoneTracker when recommendedVisualization is timeline or the prompt asks for readiness, roadmap, diligence, or milestones.",
    "Use DonutChart when recommendedVisualization is donut_chart or the prompt asks for donut, pie, share split, or AI vs human contribution.",
    "Use MetricGrid only for multi-KPI scorecards, not when one number should dominate.",
    "Use LineChart or BarChart for trend, forecast, comparison, graph, or chart requests.",
    "Use DataTable for multi-column operational lists with owners, statuses, or blockers.",
    "Use InsightList as the primary block for analysis, why, recommendation, risk, anomaly, or opportunity requests.",
    "Use FormPreview as the primary block for requested forms, inputs, planners, or calculators.",
    "For composite requests, use two complementary blocks. Good stacks include StatHero plus MetricGrid, chart plus InsightList, ProgressGauge plus RankedList, or MetricGrid plus chart.",
    "For runway left requests, the chart must show future months and cash remaining/money left, not burn or spend history.",
    "Do not put MetricGrid before every widget. Prefer varied blocks across a board.",
    "Use one to three blocks. Avoid repeating the same block stack across unrelated prompts.",
    "Keep narrative blocks concise.",
    "Prefer a compact layout that fits inside a 440 by 320 canvas widget.",
  ],
  examples: [
    'root = DashboardWidget("Runway forecast", "Cash remaining at current burn", "Preview data generated by AI.", [hero, metrics])\nhero = StatHero({label: "Cash on hand", value: "$2.4M", delta: "14.8 mo runway", tone: "positive"}, "Cash balance trend", [{label: "Jan", values: [2840]}, {label: "Jun", values: [2400]}], [{label: "Cash ($k)", tone: "positive"}], -1)\nmetrics = MetricGrid([{label: "Net burn", value: "$162k", delta: "-7% MoM", tone: "positive"}, {label: "Next raise", value: "Jan 2027", delta: "Target close", tone: "warning"}])',
    'root = DashboardWidget("Activation funnel", "Signup to paid conversion", "Preview data generated by AI.", [funnel])\nfunnel = FunnelSteps("Activation funnel", [{label: "Signup", value: 1240, dropoff: "", tone: "positive"}, {label: "Connected data", value: 812, dropoff: "-35%", tone: "neutral"}, {label: "Paid", value: 142, dropoff: "-83%", tone: "positive"}])',
    'root = DashboardWidget("Customer concentration", "Top account exposure", "Preview data generated by AI.", [ranking])\nranking = RankedList("Top account exposure", [{label: "Northstar AI", value: "$212k", detail: "Renewal Aug", badge: "Low", tone: "positive"}, {label: "Mercury Ops", value: "$141k", detail: "Renewal Jul", badge: "High", tone: "negative"}])',
    'root = DashboardWidget("Fundraising readiness", "Series A diligence", "Preview data generated by AI.", [timeline])\ntimeline = MilestoneTracker("Readiness milestones", [{label: "Usage growth story", detail: "Weekly active teams up 34%", status: "done"}, {label: "SOC 2 packet", detail: "Needs one owner", status: "blocked"}, {label: "Partner meetings", detail: "Target next month", status: "active"}])',
    'root = DashboardWidget("AI spend efficiency", "Useful output vs token waste", "Preview data generated by AI.", [gauges])\ngauges = ProgressGauge([{label: "Useful output", value: 87, target: 100, unit: "%", tone: "positive"}, {label: "Wasted tokens", value: 13, target: 100, unit: "%", tone: "warning"}, {label: "Cost/workflow", value: 14, target: 20, unit: " cents", tone: "positive"}])',
  ],
};

export const library = dashboardLibrary;
