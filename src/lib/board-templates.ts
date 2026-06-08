import type { CanvasBoard, CanvasWidget, ExampleWidgetData } from "@/lib/dashboard-schemas";

export const BLANK_BOARD_ID = "blank";

const TEMPLATE_WIDGET_WIDTH = 440;
const TEMPLATE_WIDGET_HEIGHT = 320;
const TEMPLATE_CANVAS_CENTER_X = 100000;
const TEMPLATE_CANVAS_CENTER_Y = 100000;
const TEMPLATE_GAP = 36;
const PREVIEW_DISCLOSURE = "AI-generated preview data.";

type TemplateWidgetDefinition = Pick<
  CanvasWidget,
  "height" | "openuiSource" | "prompt" | "width" | "x" | "y"
> & {
  id: string;
  exampleData: ExampleWidgetData;
};

export type BoardTemplate = {
  id: string;
  name: string;
  widgets: TemplateWidgetDefinition[];
};

function gridPosition(column: 0 | 1, row: 0 | 1) {
  const totalWidth = TEMPLATE_WIDGET_WIDTH * 2 + TEMPLATE_GAP;
  const totalHeight = TEMPLATE_WIDGET_HEIGHT * 2 + TEMPLATE_GAP;

  return {
    x: TEMPLATE_CANVAS_CENTER_X - totalWidth / 2 + column * (TEMPLATE_WIDGET_WIDTH + TEMPLATE_GAP),
    y: TEMPLATE_CANVAS_CENTER_Y - totalHeight / 2 + row * (TEMPLATE_WIDGET_HEIGHT + TEMPLATE_GAP),
  };
}

function widget(
  id: string,
  prompt: string,
  position: ReturnType<typeof gridPosition>,
  exampleData: ExampleWidgetData,
  openuiSource: string,
): TemplateWidgetDefinition {
  return {
    id,
    height: TEMPLATE_WIDGET_HEIGHT,
    openuiSource,
    prompt,
    width: TEMPLATE_WIDGET_WIDTH,
    ...position,
    exampleData,
  };
}

function emptyTable() {
  return {
    columns: [],
    rows: [],
    title: "",
  };
}

function emptyTimeSeries() {
  return {
    points: [],
    projectionStartIndex: -1,
    series: [],
    title: "",
  };
}

const founderRunwayData: ExampleWidgetData = {
  title: "Runway forecast",
  subtitle: "Next 6 months",
  dataDisclosure: PREVIEW_DISCLOSURE,
  recommendedVisualization: "composite",
  metrics: [
    { label: "Cash", value: "$2.4M", delta: "14.8 months left", tone: "positive" },
    { label: "Net burn", value: "$162k", delta: "-7% vs last month", tone: "positive" },
  ],
  timeSeries: {
    title: "Cash remaining",
    projectionStartIndex: 0,
    series: [{ label: "Projected cash", tone: "warning" }],
    points: [
      { label: "Jul", values: [2400] },
      { label: "Aug", values: [2238] },
      { label: "Sep", values: [2084] },
      { label: "Oct", values: [1924] },
      { label: "Nov", values: [1760] },
      { label: "Dec", values: [1588] },
    ],
  },
  table: emptyTable(),
  insights: [],
  formFields: [],
};

const founderArrData: ExampleWidgetData = {
  title: "ARR growth",
  subtitle: "Bookings and expansion",
  dataDisclosure: PREVIEW_DISCLOSURE,
  recommendedVisualization: "line_chart",
  metrics: [
    { label: "ARR", value: "$1.82M", delta: "+18% QoQ", tone: "positive" },
    { label: "Net retention", value: "118%", delta: "+5pp QoQ", tone: "positive" },
  ],
  timeSeries: {
    title: "ARR trajectory",
    projectionStartIndex: -1,
    series: [{ label: "ARR", tone: "positive" }],
    points: [
      { label: "Jan", values: [1120] },
      { label: "Feb", values: [1245] },
      { label: "Mar", values: [1395] },
      { label: "Apr", values: [1510] },
      { label: "May", values: [1668] },
      { label: "Jun", values: [1820] },
    ],
  },
  table: emptyTable(),
  insights: [],
  formFields: [],
};

const founderBurnData: ExampleWidgetData = {
  title: "Burn breakdown",
  subtitle: "Current month",
  dataDisclosure: PREVIEW_DISCLOSURE,
  recommendedVisualization: "table",
  metrics: [],
  timeSeries: emptyTimeSeries(),
  table: {
    title: "Spend by area",
    columns: ["Area", "Spend", "MoM", "Owner"],
    rows: [
      { cells: ["Payroll", "$118k", "+4%", "Founder"] },
      { cells: ["AI infra", "$21k", "-9%", "Eng"] },
      { cells: ["GTM tools", "$13k", "+6%", "Sales"] },
      { cells: ["Ops vendors", "$10k", "-3%", "Ops"] },
    ],
  },
  insights: [],
  formFields: [],
};

const founderEfficiencyData: ExampleWidgetData = {
  title: "AI spend efficiency",
  subtitle: "Waste and useful output",
  dataDisclosure: PREVIEW_DISCLOSURE,
  recommendedVisualization: "composite",
  metrics: [
    { label: "AI spend", value: "$21.4k", delta: "-9% MoM", tone: "positive" },
    { label: "Wasted tokens", value: "12.6%", delta: "-4.2pp", tone: "positive" },
  ],
  timeSeries: emptyTimeSeries(),
  table: emptyTable(),
  insights: [
    {
      label: "Prompt trimming is working",
      detail: "Context caps reduced monthly waste while keeping agent throughput up.",
      tone: "positive",
    },
    {
      label: "Retry loops still matter",
      detail: "Sales enrichment and support triage create most avoidable reruns.",
      tone: "warning",
    },
  ],
  formFields: [],
};

const engineeringVelocityData: ExampleWidgetData = {
  title: "Engineering velocity",
  subtitle: "Past 6 sprints",
  dataDisclosure: PREVIEW_DISCLOSURE,
  recommendedVisualization: "line_chart",
  metrics: [
    { label: "Merged PRs", value: "86", delta: "+14 vs prior", tone: "positive" },
    { label: "Cycle time", value: "1.8d", delta: "-0.4d", tone: "positive" },
  ],
  timeSeries: {
    title: "Sprint throughput",
    projectionStartIndex: -1,
    series: [
      { label: "Merged PRs", tone: "positive" },
      { label: "Escaped bugs", tone: "warning" },
    ],
    points: [
      { label: "S1", values: [52, 8] },
      { label: "S2", values: [57, 7] },
      { label: "S3", values: [61, 6] },
      { label: "S4", values: [72, 5] },
      { label: "S5", values: [78, 5] },
      { label: "S6", values: [86, 4] },
    ],
  },
  table: emptyTable(),
  insights: [],
  formFields: [],
};

const engineeringIncidentsData: ExampleWidgetData = {
  title: "Incident load",
  subtitle: "Severity and response",
  dataDisclosure: PREVIEW_DISCLOSURE,
  recommendedVisualization: "bar_chart",
  metrics: [
    { label: "P0/P1", value: "3", delta: "-2 vs prior month", tone: "positive" },
    { label: "MTTR", value: "42m", delta: "-18m", tone: "positive" },
  ],
  timeSeries: {
    title: "Incidents by week",
    projectionStartIndex: -1,
    series: [
      { label: "P0/P1", tone: "negative" },
      { label: "P2", tone: "warning" },
    ],
    points: [
      { label: "W1", values: [1, 6] },
      { label: "W2", values: [0, 5] },
      { label: "W3", values: [2, 4] },
      { label: "W4", values: [0, 3] },
    ],
  },
  table: emptyTable(),
  insights: [],
  formFields: [],
};

const engineeringModelData: ExampleWidgetData = {
  title: "Model reliability",
  subtitle: "Latency and retries",
  dataDisclosure: PREVIEW_DISCLOSURE,
  recommendedVisualization: "table",
  metrics: [],
  timeSeries: emptyTimeSeries(),
  table: {
    title: "Workflow health",
    columns: ["Workflow", "P95 latency", "Retry rate", "Cost/run"],
    rows: [
      { cells: ["Research agent", "7.8s", "4.1%", "$0.18"] },
      { cells: ["Support triage", "3.2s", "2.7%", "$0.04"] },
      { cells: ["Code review", "9.4s", "5.6%", "$0.22"] },
      { cells: ["Sales enrichment", "5.1s", "8.9%", "$0.11"] },
    ],
  },
  insights: [],
  formFields: [],
};

const engineeringQualityData: ExampleWidgetData = {
  title: "Quality and evals",
  subtitle: "Release readiness",
  dataDisclosure: PREVIEW_DISCLOSURE,
  recommendedVisualization: "insights",
  metrics: [],
  timeSeries: emptyTimeSeries(),
  table: emptyTable(),
  insights: [
    {
      label: "Eval pass rate recovered",
      detail: "Routing changes lifted agent accuracy after the latest prompt cleanup.",
      tone: "positive",
    },
    {
      label: "Checkout flow needs review",
      detail: "The two newest failures are clustered in billing-state transitions.",
      tone: "warning",
    },
    {
      label: "Rollback risk is low",
      detail: "No migration failures or schema drift showed up in staging checks.",
      tone: "positive",
    },
  ],
  formFields: [],
};

const salesPipelineData: ExampleWidgetData = {
  title: "Pipeline coverage",
  subtitle: "Current quarter",
  dataDisclosure: PREVIEW_DISCLOSURE,
  recommendedVisualization: "composite",
  metrics: [
    { label: "Pipeline", value: "$842k", delta: "3.1x target", tone: "positive" },
    { label: "Qualified opps", value: "46", delta: "+9 this month", tone: "positive" },
  ],
  timeSeries: {
    title: "Pipeline by stage",
    projectionStartIndex: -1,
    series: [{ label: "Value", tone: "positive" }],
    points: [
      { label: "Lead", values: [1260] },
      { label: "Qualified", values: [842] },
      { label: "Demo", values: [516] },
      { label: "Proposal", values: [294] },
      { label: "Commit", values: [168] },
    ],
  },
  table: emptyTable(),
  insights: [],
  formFields: [],
};

const salesWinRateData: ExampleWidgetData = {
  title: "Win rate trend",
  subtitle: "Last 6 months",
  dataDisclosure: PREVIEW_DISCLOSURE,
  recommendedVisualization: "line_chart",
  metrics: [
    { label: "Win rate", value: "28%", delta: "+6pp", tone: "positive" },
    { label: "Sales cycle", value: "31d", delta: "-5d", tone: "positive" },
  ],
  timeSeries: {
    title: "Win rate",
    projectionStartIndex: -1,
    series: [{ label: "Closed-won %", tone: "positive" }],
    points: [
      { label: "Jan", values: [19] },
      { label: "Feb", values: [21] },
      { label: "Mar", values: [22] },
      { label: "Apr", values: [24] },
      { label: "May", values: [26] },
      { label: "Jun", values: [28] },
    ],
  },
  table: emptyTable(),
  insights: [],
  formFields: [],
};

const salesForecastData: ExampleWidgetData = {
  title: "Revenue forecast",
  subtitle: "This quarter",
  dataDisclosure: PREVIEW_DISCLOSURE,
  recommendedVisualization: "table",
  metrics: [],
  timeSeries: emptyTimeSeries(),
  table: {
    title: "Forecast by segment",
    columns: ["Segment", "Commit", "Best case", "Risk"],
    rows: [
      { cells: ["Seed startups", "$92k", "$138k", "Low"] },
      { cells: ["Scaleups", "$186k", "$264k", "Medium"] },
      { cells: ["Enterprise pilots", "$72k", "$188k", "High"] },
      { cells: ["Expansion", "$114k", "$142k", "Low"] },
    ],
  },
  insights: [],
  formFields: [],
};

const salesStuckDealsData: ExampleWidgetData = {
  title: "Stuck deals",
  subtitle: "Action list",
  dataDisclosure: PREVIEW_DISCLOSURE,
  recommendedVisualization: "insights",
  metrics: [],
  timeSeries: emptyTimeSeries(),
  table: emptyTable(),
  insights: [
    {
      label: "Security reviews are slowing expansion",
      detail: "Five high-value deals are waiting on vendor questionnaires.",
      tone: "warning",
    },
    {
      label: "Champion silence is rising",
      detail: "Three demos have no buyer reply after pricing was sent.",
      tone: "negative",
    },
    {
      label: "AI ROI proof helps closes",
      detail: "Deals with workflow savings attached close 9 days faster.",
      tone: "positive",
    },
  ],
  formFields: [],
};

const opsSupportData: ExampleWidgetData = {
  title: "Support load",
  subtitle: "Tickets and deflection",
  dataDisclosure: PREVIEW_DISCLOSURE,
  recommendedVisualization: "line_chart",
  metrics: [
    { label: "Open tickets", value: "128", delta: "-17 this week", tone: "positive" },
    { label: "AI deflection", value: "42%", delta: "+8pp", tone: "positive" },
  ],
  timeSeries: {
    title: "Ticket volume",
    projectionStartIndex: -1,
    series: [
      { label: "Created", tone: "warning" },
      { label: "Resolved", tone: "positive" },
    ],
    points: [
      { label: "Mon", values: [58, 46] },
      { label: "Tue", values: [64, 52] },
      { label: "Wed", values: [49, 58] },
      { label: "Thu", values: [43, 61] },
      { label: "Fri", values: [38, 56] },
    ],
  },
  table: emptyTable(),
  insights: [],
  formFields: [],
};

const opsHiringData: ExampleWidgetData = {
  title: "Hiring and onboarding",
  subtitle: "Team capacity",
  dataDisclosure: PREVIEW_DISCLOSURE,
  recommendedVisualization: "bar_chart",
  metrics: [
    { label: "Open roles", value: "7", delta: "3 priority", tone: "warning" },
    { label: "Ramp time", value: "19d", delta: "-4d", tone: "positive" },
  ],
  timeSeries: {
    title: "People pipeline",
    projectionStartIndex: -1,
    series: [{ label: "Candidates", tone: "neutral" }],
    points: [
      { label: "Applied", values: [182] },
      { label: "Screen", values: [44] },
      { label: "Onsite", values: [16] },
      { label: "Offer", values: [5] },
      { label: "Accepted", values: [3] },
    ],
  },
  table: emptyTable(),
  insights: [],
  formFields: [],
};

const opsVendorData: ExampleWidgetData = {
  title: "Vendor spend",
  subtitle: "Renewals and waste",
  dataDisclosure: PREVIEW_DISCLOSURE,
  recommendedVisualization: "table",
  metrics: [],
  timeSeries: emptyTimeSeries(),
  table: {
    title: "Top renewals",
    columns: ["Vendor", "Monthly", "Renewal", "Action"],
    rows: [
      { cells: ["CRM", "$4.8k", "Jul 12", "Right-size seats"] },
      { cells: ["Data warehouse", "$6.1k", "Jul 28", "Commit discount"] },
      { cells: ["Support suite", "$3.4k", "Aug 04", "Review automations"] },
      { cells: ["Analytics", "$2.2k", "Aug 19", "Remove duplicates"] },
    ],
  },
  insights: [],
  formFields: [],
};

const opsBottleneckData: ExampleWidgetData = {
  title: "Process bottlenecks",
  subtitle: "Where work gets stuck",
  dataDisclosure: PREVIEW_DISCLOSURE,
  recommendedVisualization: "insights",
  metrics: [],
  timeSeries: emptyTimeSeries(),
  table: emptyTable(),
  insights: [
    {
      label: "Security intake needs an owner",
      detail: "Customer questionnaires wait longest when sales and eng both touch them.",
      tone: "warning",
    },
    {
      label: "Onboarding tasks are clearer",
      detail: "Template checklists reduced new-hire setup misses by 31%.",
      tone: "positive",
    },
    {
      label: "Invoice approval is noisy",
      detail: "Five recurring vendors still route to founders for manual approval.",
      tone: "warning",
    },
  ],
  formFields: [],
};

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: "founder",
    name: "Founder",
    widgets: [
      widget(
        "runway",
        "show founder runway forecast with cash remaining and net burn",
        gridPosition(0, 0),
        founderRunwayData,
        `root = DashboardWidget("Runway forecast", "Next 6 months", "AI-generated preview data.", [metrics, chart])
metrics = MetricGrid([{label: "Cash", value: "$2.4M", delta: "14.8 months left", tone: "positive"}, {label: "Net burn", value: "$162k", delta: "-7% vs last month", tone: "positive"}])
chart = LineChart("Cash remaining", [{label: "Jul", values: [2400]}, {label: "Aug", values: [2238]}, {label: "Sep", values: [2084]}, {label: "Oct", values: [1924]}, {label: "Nov", values: [1760]}, {label: "Dec", values: [1588]}], [{label: "Projected cash", tone: "warning"}], 0)`,
      ),
      widget(
        "arr",
        "show founder ARR growth and net retention",
        gridPosition(1, 0),
        founderArrData,
        `root = DashboardWidget("ARR growth", "Bookings and expansion", "AI-generated preview data.", [metrics, chart])
metrics = MetricGrid([{label: "ARR", value: "$1.82M", delta: "+18% QoQ", tone: "positive"}, {label: "Net retention", value: "118%", delta: "+5pp QoQ", tone: "positive"}])
chart = LineChart("ARR trajectory", [{label: "Jan", values: [1120]}, {label: "Feb", values: [1245]}, {label: "Mar", values: [1395]}, {label: "Apr", values: [1510]}, {label: "May", values: [1668]}, {label: "Jun", values: [1820]}], [{label: "ARR", tone: "positive"}], -1)`,
      ),
      widget(
        "burn",
        "show founder burn breakdown by area",
        gridPosition(0, 1),
        founderBurnData,
        `root = DashboardWidget("Burn breakdown", "Current month", "AI-generated preview data.", [table])
table = DataTable("Spend by area", ["Area", "Spend", "MoM", "Owner"], [{cells: ["Payroll", "$118k", "+4%", "Founder"]}, {cells: ["AI infra", "$21k", "-9%", "Eng"]}, {cells: ["GTM tools", "$13k", "+6%", "Sales"]}, {cells: ["Ops vendors", "$10k", "-3%", "Ops"]}])`,
      ),
      widget(
        "efficiency",
        "show founder AI spend efficiency and token waste risks",
        gridPosition(1, 1),
        founderEfficiencyData,
        `root = DashboardWidget("AI spend efficiency", "Waste and useful output", "AI-generated preview data.", [metrics, insights])
metrics = MetricGrid([{label: "AI spend", value: "$21.4k", delta: "-9% MoM", tone: "positive"}, {label: "Wasted tokens", value: "12.6%", delta: "-4.2pp", tone: "positive"}])
insights = InsightList("Top findings", [{label: "Prompt trimming is working", detail: "Context caps reduced monthly waste while keeping agent throughput up.", tone: "positive"}, {label: "Retry loops still matter", detail: "Sales enrichment and support triage create most avoidable reruns.", tone: "warning"}])`,
      ),
    ],
  },
  {
    id: "engineering",
    name: "Engineering",
    widgets: [
      widget(
        "velocity",
        "show engineering velocity across recent sprints",
        gridPosition(0, 0),
        engineeringVelocityData,
        `root = DashboardWidget("Engineering velocity", "Past 6 sprints", "AI-generated preview data.", [metrics, chart])
metrics = MetricGrid([{label: "Merged PRs", value: "86", delta: "+14 vs prior", tone: "positive"}, {label: "Cycle time", value: "1.8d", delta: "-0.4d", tone: "positive"}])
chart = LineChart("Sprint throughput", [{label: "S1", values: [52, 8]}, {label: "S2", values: [57, 7]}, {label: "S3", values: [61, 6]}, {label: "S4", values: [72, 5]}, {label: "S5", values: [78, 5]}, {label: "S6", values: [86, 4]}], [{label: "Merged PRs", tone: "positive"}, {label: "Escaped bugs", tone: "warning"}], -1)`,
      ),
      widget(
        "incidents",
        "show engineering incident load by severity",
        gridPosition(1, 0),
        engineeringIncidentsData,
        `root = DashboardWidget("Incident load", "Severity and response", "AI-generated preview data.", [metrics, chart])
metrics = MetricGrid([{label: "P0/P1", value: "3", delta: "-2 vs prior month", tone: "positive"}, {label: "MTTR", value: "42m", delta: "-18m", tone: "positive"}])
chart = BarChart("Incidents by week", [{label: "W1", values: [1, 6]}, {label: "W2", values: [0, 5]}, {label: "W3", values: [2, 4]}, {label: "W4", values: [0, 3]}], [{label: "P0/P1", tone: "negative"}, {label: "P2", tone: "warning"}])`,
      ),
      widget(
        "models",
        "show engineering model latency retries and cost by workflow",
        gridPosition(0, 1),
        engineeringModelData,
        `root = DashboardWidget("Model reliability", "Latency and retries", "AI-generated preview data.", [table])
table = DataTable("Workflow health", ["Workflow", "P95 latency", "Retry rate", "Cost/run"], [{cells: ["Research agent", "7.8s", "4.1%", "$0.18"]}, {cells: ["Support triage", "3.2s", "2.7%", "$0.04"]}, {cells: ["Code review", "9.4s", "5.6%", "$0.22"]}, {cells: ["Sales enrichment", "5.1s", "8.9%", "$0.11"]}])`,
      ),
      widget(
        "quality",
        "show engineering quality and eval release readiness",
        gridPosition(1, 1),
        engineeringQualityData,
        `root = DashboardWidget("Quality and evals", "Release readiness", "AI-generated preview data.", [insights])
insights = InsightList("Readiness notes", [{label: "Eval pass rate recovered", detail: "Routing changes lifted agent accuracy after the latest prompt cleanup.", tone: "positive"}, {label: "Checkout flow needs review", detail: "The two newest failures are clustered in billing-state transitions.", tone: "warning"}, {label: "Rollback risk is low", detail: "No migration failures or schema drift showed up in staging checks.", tone: "positive"}])`,
      ),
    ],
  },
  {
    id: "sales",
    name: "Sales",
    widgets: [
      widget(
        "pipeline",
        "show sales pipeline coverage by stage",
        gridPosition(0, 0),
        salesPipelineData,
        `root = DashboardWidget("Pipeline coverage", "Current quarter", "AI-generated preview data.", [metrics, chart])
metrics = MetricGrid([{label: "Pipeline", value: "$842k", delta: "3.1x target", tone: "positive"}, {label: "Qualified opps", value: "46", delta: "+9 this month", tone: "positive"}])
chart = BarChart("Pipeline by stage", [{label: "Lead", values: [1260]}, {label: "Qualified", values: [842]}, {label: "Demo", values: [516]}, {label: "Proposal", values: [294]}, {label: "Commit", values: [168]}], [{label: "Value", tone: "positive"}])`,
      ),
      widget(
        "win-rate",
        "show sales win rate and sales cycle trend",
        gridPosition(1, 0),
        salesWinRateData,
        `root = DashboardWidget("Win rate trend", "Last 6 months", "AI-generated preview data.", [metrics, chart])
metrics = MetricGrid([{label: "Win rate", value: "28%", delta: "+6pp", tone: "positive"}, {label: "Sales cycle", value: "31d", delta: "-5d", tone: "positive"}])
chart = LineChart("Win rate", [{label: "Jan", values: [19]}, {label: "Feb", values: [21]}, {label: "Mar", values: [22]}, {label: "Apr", values: [24]}, {label: "May", values: [26]}, {label: "Jun", values: [28]}], [{label: "Closed-won %", tone: "positive"}], -1)`,
      ),
      widget(
        "forecast",
        "show sales revenue forecast by segment",
        gridPosition(0, 1),
        salesForecastData,
        `root = DashboardWidget("Revenue forecast", "This quarter", "AI-generated preview data.", [table])
table = DataTable("Forecast by segment", ["Segment", "Commit", "Best case", "Risk"], [{cells: ["Seed startups", "$92k", "$138k", "Low"]}, {cells: ["Scaleups", "$186k", "$264k", "Medium"]}, {cells: ["Enterprise pilots", "$72k", "$188k", "High"]}, {cells: ["Expansion", "$114k", "$142k", "Low"]}])`,
      ),
      widget(
        "stuck-deals",
        "show sales stuck deals and next actions",
        gridPosition(1, 1),
        salesStuckDealsData,
        `root = DashboardWidget("Stuck deals", "Action list", "AI-generated preview data.", [insights])
insights = InsightList("Deal risks", [{label: "Security reviews are slowing expansion", detail: "Five high-value deals are waiting on vendor questionnaires.", tone: "warning"}, {label: "Champion silence is rising", detail: "Three demos have no buyer reply after pricing was sent.", tone: "negative"}, {label: "AI ROI proof helps closes", detail: "Deals with workflow savings attached close 9 days faster.", tone: "positive"}])`,
      ),
    ],
  },
  {
    id: "ops",
    name: "Ops",
    widgets: [
      widget(
        "support",
        "show ops support load and AI deflection",
        gridPosition(0, 0),
        opsSupportData,
        `root = DashboardWidget("Support load", "Tickets and deflection", "AI-generated preview data.", [metrics, chart])
metrics = MetricGrid([{label: "Open tickets", value: "128", delta: "-17 this week", tone: "positive"}, {label: "AI deflection", value: "42%", delta: "+8pp", tone: "positive"}])
chart = LineChart("Ticket volume", [{label: "Mon", values: [58, 46]}, {label: "Tue", values: [64, 52]}, {label: "Wed", values: [49, 58]}, {label: "Thu", values: [43, 61]}, {label: "Fri", values: [38, 56]}], [{label: "Created", tone: "warning"}, {label: "Resolved", tone: "positive"}], -1)`,
      ),
      widget(
        "hiring",
        "show ops hiring pipeline and onboarding ramp",
        gridPosition(1, 0),
        opsHiringData,
        `root = DashboardWidget("Hiring and onboarding", "Team capacity", "AI-generated preview data.", [metrics, chart])
metrics = MetricGrid([{label: "Open roles", value: "7", delta: "3 priority", tone: "warning"}, {label: "Ramp time", value: "19d", delta: "-4d", tone: "positive"}])
chart = BarChart("People pipeline", [{label: "Applied", values: [182]}, {label: "Screen", values: [44]}, {label: "Onsite", values: [16]}, {label: "Offer", values: [5]}, {label: "Accepted", values: [3]}], [{label: "Candidates", tone: "neutral"}])`,
      ),
      widget(
        "vendors",
        "show ops vendor spend renewals and waste",
        gridPosition(0, 1),
        opsVendorData,
        `root = DashboardWidget("Vendor spend", "Renewals and waste", "AI-generated preview data.", [table])
table = DataTable("Top renewals", ["Vendor", "Monthly", "Renewal", "Action"], [{cells: ["CRM", "$4.8k", "Jul 12", "Right-size seats"]}, {cells: ["Data warehouse", "$6.1k", "Jul 28", "Commit discount"]}, {cells: ["Support suite", "$3.4k", "Aug 04", "Review automations"]}, {cells: ["Analytics", "$2.2k", "Aug 19", "Remove duplicates"]}])`,
      ),
      widget(
        "bottlenecks",
        "show ops process bottlenecks and improvements",
        gridPosition(1, 1),
        opsBottleneckData,
        `root = DashboardWidget("Process bottlenecks", "Where work gets stuck", "AI-generated preview data.", [insights])
insights = InsightList("Bottlenecks", [{label: "Security intake needs an owner", detail: "Customer questionnaires wait longest when sales and eng both touch them.", tone: "warning"}, {label: "Onboarding tasks are clearer", detail: "Template checklists reduced new-hire setup misses by 31%.", tone: "positive"}, {label: "Invoice approval is noisy", detail: "Five recurring vendors still route to founders for manual approval.", tone: "warning"}])`,
      ),
    ],
  },
];

export function createBoardFromTemplate(template: BoardTemplate, now = Date.now()): CanvasBoard {
  return {
    id: template.id,
    name: template.name,
    templateId: template.id,
    createdAt: now,
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
