import type {
  CanvasBoard,
  CanvasWidget,
  ChartPoint,
  ChartSeries,
  ExampleWidgetData,
  FormFieldData,
  InsightData,
  MetricData,
  TableData,
} from "@/lib/dashboard-schemas";

export const BLANK_BOARD_ID = "blank";
export const BOARD_TEMPLATE_VERSION = 2;

const TEMPLATE_WIDGET_WIDTH = 440;
const TEMPLATE_WIDGET_HEIGHT = 320;
const TEMPLATE_CANVAS_CENTER_X = 100000;
const TEMPLATE_CANVAS_CENTER_Y = 100000;
const TEMPLATE_GAP = 36;
const PREVIEW_DISCLOSURE = "AI-generated preview data.";

type TemplateGridCoordinate = 0 | 1 | 2;
type TemplateVisualization = ExampleWidgetData["recommendedVisualization"];
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

function gridPosition(column: TemplateGridCoordinate, row: TemplateGridCoordinate) {
  const totalWidth = TEMPLATE_WIDGET_WIDTH * 3 + TEMPLATE_GAP * 2;
  const totalHeight = TEMPLATE_WIDGET_HEIGHT * 3 + TEMPLATE_GAP * 2;

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
): TemplateWidgetDefinition {
  return {
    id,
    height: TEMPLATE_WIDGET_HEIGHT,
    openuiSource: openuiSourceForData(exampleData),
    prompt,
    width: TEMPLATE_WIDGET_WIDTH,
    ...position,
    exampleData,
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

function exampleWidgetData(input: ExampleWidgetDataInput): ExampleWidgetData {
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

const founderRunwayData = exampleWidgetData({
  title: "Runway forecast",
  subtitle: "Cash, burn, and financing date",
  recommendedVisualization: "metrics",
  metrics: [
    { label: "Cash", value: "$2.4M", delta: "14.8 months left", tone: "positive" },
    { label: "Net burn", value: "$162k", delta: "-7% MoM", tone: "positive" },
    { label: "Default alive", value: "Yes", delta: "At current plan", tone: "positive" },
    { label: "Next raise", value: "Jan 2027", delta: "Target close", tone: "warning" },
  ],
});

const founderArrData = exampleWidgetData({
  title: "ARR growth",
  subtitle: "Bookings, expansion, contraction",
  recommendedVisualization: "line_chart",
  timeSeries: {
    title: "ARR trajectory",
    projectionStartIndex: -1,
    series: [
      { label: "ARR", tone: "positive" },
      { label: "Expansion ARR", tone: "neutral" },
    ],
    points: [
      { label: "Jan", values: [1120, 84] },
      { label: "Feb", values: [1245, 96] },
      { label: "Mar", values: [1395, 108] },
      { label: "Apr", values: [1510, 126] },
      { label: "May", values: [1668, 143] },
      { label: "Jun", values: [1820, 161] },
    ],
  },
});

const founderBurnData = exampleWidgetData({
  title: "Burn breakdown",
  subtitle: "Current month",
  recommendedVisualization: "table",
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
});

const founderEfficiencyData = exampleWidgetData({
  title: "AI spend efficiency",
  subtitle: "Useful output vs token waste",
  recommendedVisualization: "metrics",
  metrics: [
    { label: "AI spend", value: "$21.4k", delta: "-9% MoM", tone: "positive" },
    { label: "Wasted tokens", value: "12.6%", delta: "-4.2pp", tone: "positive" },
    { label: "Retry waste", value: "$2.8k", delta: "-$1.1k", tone: "positive" },
    { label: "Cost/workflow", value: "$0.14", delta: "-18%", tone: "positive" },
  ],
});

const founderCustomerRiskData = exampleWidgetData({
  title: "Customer concentration",
  subtitle: "Renewal and expansion risk",
  recommendedVisualization: "table",
  table: {
    title: "Top account exposure",
    columns: ["Account", "ARR", "Renewal", "Risk"],
    rows: [
      { cells: ["Northstar AI", "$212k", "Aug", "Low"] },
      { cells: ["Kite Health", "$184k", "Sep", "Medium"] },
      { cells: ["Mercury Ops", "$141k", "Jul", "High"] },
      { cells: ["BrightPath", "$96k", "Oct", "Low"] },
    ],
  },
});

const founderActivationData = exampleWidgetData({
  title: "Activation funnel",
  subtitle: "Signup to paid conversion",
  recommendedVisualization: "bar_chart",
  timeSeries: {
    title: "Activation funnel",
    projectionStartIndex: -1,
    series: [{ label: "Accounts", tone: "positive" }],
    points: [
      { label: "Signup", values: [1240] },
      { label: "Connected data", values: [812] },
      { label: "First board", values: [604] },
      { label: "Team invite", values: [318] },
      { label: "Paid", values: [142] },
    ],
  },
});

const founderGrossMarginData = exampleWidgetData({
  title: "Gross margin",
  subtitle: "Model and infra impact",
  recommendedVisualization: "metrics",
  metrics: [
    { label: "Gross margin", value: "72%", delta: "+3pp QoQ", tone: "positive" },
    { label: "Model COGS", value: "$18.6k", delta: "-11% MoM", tone: "positive" },
    { label: "Infra COGS", value: "$24.1k", delta: "+2% MoM", tone: "neutral" },
    { label: "Target margin", value: "75%", delta: "3pp gap", tone: "warning" },
  ],
});

const founderFundraisingData = exampleWidgetData({
  title: "Fundraising readiness",
  subtitle: "Milestones and diligence gaps",
  recommendedVisualization: "insights",
  insights: [
    {
      label: "Usage growth supports the story",
      detail: "Weekly active teams are up 34% since the pricing change.",
      tone: "positive",
    },
    {
      label: "Security packet is the gating item",
      detail: "SOC 2 evidence and subprocessors need one owner before partner meetings.",
      tone: "warning",
    },
    {
      label: "Margin proof is improving",
      detail: "Routing cheaper models on low-risk workflows lifted margin by 3pp.",
      tone: "positive",
    },
  ],
});

const founderPrioritiesData = exampleWidgetData({
  title: "Weekly priorities",
  subtitle: "Blockers and owners",
  recommendedVisualization: "table",
  table: {
    title: "Founder operating list",
    columns: ["Priority", "Owner", "Status", "Blocker"],
    rows: [
      { cells: ["Close seed lead", "CEO", "On track", "Partner call"] },
      { cells: ["Cut AI waste", "CTO", "On track", "Eval signoff"] },
      { cells: ["Launch pricing", "GTM", "At risk", "Billing copy"] },
      { cells: ["SOC 2 packet", "Ops", "Blocked", "Evidence owner"] },
    ],
  },
});

const engineeringVelocityData = exampleWidgetData({
  title: "Engineering velocity",
  subtitle: "Past 6 sprints",
  recommendedVisualization: "line_chart",
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
});

const engineeringIncidentsData = exampleWidgetData({
  title: "Incident load",
  subtitle: "Severity and response",
  recommendedVisualization: "bar_chart",
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
});

const engineeringModelData = exampleWidgetData({
  title: "Model reliability",
  subtitle: "Latency, retries, and cost",
  recommendedVisualization: "table",
  table: {
    title: "Workflow health",
    columns: ["Workflow", "P95 latency", "Retry rate", "Cost/run"],
    rows: [
      { cells: ["Research agent", "7.8s", "4.1%", "$0.18"] },
      { cells: ["Support triage", "3.2s", "2.7%", "$0.04"] },
      { cells: ["Code review", "9.4s", "5.6%", "$0.22"] },
      { cells: ["Sales enrich", "5.1s", "8.9%", "$0.11"] },
    ],
  },
});

const engineeringQualityData = exampleWidgetData({
  title: "Quality and evals",
  subtitle: "Release readiness",
  recommendedVisualization: "insights",
  insights: [
    {
      label: "Eval pass rate recovered",
      detail: "Routing changes lifted agent accuracy after the latest prompt cleanup.",
      tone: "positive",
    },
    {
      label: "Checkout flow needs review",
      detail: "Two newest failures are clustered in billing-state transitions.",
      tone: "warning",
    },
    {
      label: "Rollback risk is low",
      detail: "No migration failures or schema drift showed up in staging checks.",
      tone: "positive",
    },
  ],
});

const engineeringDeploymentData = exampleWidgetData({
  title: "Deployment health",
  subtitle: "Builds and lead time",
  recommendedVisualization: "metrics",
  metrics: [
    { label: "Deploys", value: "34", delta: "+8 this week", tone: "positive" },
    { label: "Failed builds", value: "6", delta: "-3 vs last week", tone: "positive" },
    { label: "Lead time", value: "7.4h", delta: "-2.1h", tone: "positive" },
    { label: "Rollback rate", value: "1.8%", delta: "Flat", tone: "neutral" },
  ],
});

const engineeringPrReviewData = exampleWidgetData({
  title: "PR review bottlenecks",
  subtitle: "Repos and reviewer load",
  recommendedVisualization: "table",
  table: {
    title: "Slow review queues",
    columns: ["Repo", "Median wait", "Reviewer", "Backlog"],
    rows: [
      { cells: ["web-app", "8.2h", "Maya", "12 PRs"] },
      { cells: ["agents", "11.4h", "Ravi", "9 PRs"] },
      { cells: ["billing", "6.1h", "Nora", "5 PRs"] },
      { cells: ["infra", "14.8h", "Eli", "7 PRs"] },
    ],
  },
});

const engineeringTestsData = exampleWidgetData({
  title: "Test coverage",
  subtitle: "Coverage and flaky hotspots",
  recommendedVisualization: "bar_chart",
  timeSeries: {
    title: "Coverage by surface",
    projectionStartIndex: -1,
    series: [
      { label: "Coverage", tone: "positive" },
      { label: "Flaky tests", tone: "warning" },
    ],
    points: [
      { label: "API", values: [88, 3] },
      { label: "Web", values: [76, 9] },
      { label: "Agents", values: [71, 11] },
      { label: "Billing", values: [83, 4] },
    ],
  },
});

const engineeringAgentEvalData = exampleWidgetData({
  title: "Agent eval coverage",
  subtitle: "Critical workflow checks",
  recommendedVisualization: "table",
  table: {
    title: "Eval matrix",
    columns: ["Workflow", "Coverage", "Pass rate", "Gap"],
    rows: [
      { cells: ["Support triage", "91%", "94%", "Refund edge cases"] },
      { cells: ["Code review", "76%", "89%", "Security findings"] },
      { cells: ["Research", "68%", "92%", "Source grounding"] },
      { cells: ["Sales email", "83%", "88%", "Tone drift"] },
    ],
  },
});

const engineeringInfraData = exampleWidgetData({
  title: "Infra saturation",
  subtitle: "Cost and service risk",
  recommendedVisualization: "bar_chart",
  timeSeries: {
    title: "Service cost and saturation",
    projectionStartIndex: -1,
    series: [
      { label: "Monthly cost", tone: "neutral" },
      { label: "Saturation", tone: "warning" },
    ],
    points: [
      { label: "LLM proxy", values: [18, 72] },
      { label: "DB", values: [9, 81] },
      { label: "Workers", values: [12, 64] },
      { label: "Search", values: [7, 58] },
    ],
  },
});

const salesPipelineData = exampleWidgetData({
  title: "Pipeline coverage",
  subtitle: "Current quarter",
  recommendedVisualization: "bar_chart",
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
});

const salesWinRateData = exampleWidgetData({
  title: "Win rate trend",
  subtitle: "Last 6 months",
  recommendedVisualization: "line_chart",
  timeSeries: {
    title: "Win rate and cycle",
    projectionStartIndex: -1,
    series: [
      { label: "Closed-won %", tone: "positive" },
      { label: "Cycle days", tone: "warning" },
    ],
    points: [
      { label: "Jan", values: [19, 38] },
      { label: "Feb", values: [21, 36] },
      { label: "Mar", values: [22, 35] },
      { label: "Apr", values: [24, 33] },
      { label: "May", values: [26, 32] },
      { label: "Jun", values: [28, 31] },
    ],
  },
});

const salesForecastData = exampleWidgetData({
  title: "Revenue forecast",
  subtitle: "Commit and best case",
  recommendedVisualization: "table",
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
});

const salesStuckDealsData = exampleWidgetData({
  title: "Stuck deals",
  subtitle: "Blockers and next actions",
  recommendedVisualization: "insights",
  insights: [
    {
      label: "Security reviews slow expansion",
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
});

const salesLeadSourceData = exampleWidgetData({
  title: "Lead source ROI",
  subtitle: "CAC payback by channel",
  recommendedVisualization: "table",
  table: {
    title: "Channel economics",
    columns: ["Channel", "Pipeline", "CAC payback", "ROI"],
    rows: [
      { cells: ["Founder outbound", "$214k", "5.2 mo", "High"] },
      { cells: ["Content", "$164k", "7.8 mo", "Medium"] },
      { cells: ["Partners", "$286k", "4.6 mo", "High"] },
      { cells: ["Paid search", "$92k", "13.1 mo", "Low"] },
    ],
  },
});

const salesOutboundData = exampleWidgetData({
  title: "Outbound sequences",
  subtitle: "AI-personalized reply rate",
  recommendedVisualization: "bar_chart",
  timeSeries: {
    title: "Sequence performance",
    projectionStartIndex: -1,
    series: [
      { label: "Reply rate", tone: "positive" },
      { label: "Meeting rate", tone: "neutral" },
    ],
    points: [
      { label: "Generic", values: [7, 2] },
      { label: "Persona", values: [14, 5] },
      { label: "ROI proof", values: [19, 8] },
      { label: "Mutual intro", values: [27, 12] },
    ],
  },
});

const salesExpansionData = exampleWidgetData({
  title: "Expansion pipeline",
  subtitle: "Renewal risk by account",
  recommendedVisualization: "table",
  table: {
    title: "Expansion and renewal watch",
    columns: ["Account", "Upside", "Renewal", "Risk"],
    rows: [
      { cells: ["Northstar AI", "$72k", "Aug", "Low"] },
      { cells: ["Mercury Ops", "$54k", "Jul", "High"] },
      { cells: ["Kite Health", "$88k", "Sep", "Medium"] },
      { cells: ["BrightPath", "$31k", "Oct", "Low"] },
    ],
  },
});

const salesDemoConversionData = exampleWidgetData({
  title: "Demo conversion",
  subtitle: "Demo to proposal by rep",
  recommendedVisualization: "bar_chart",
  timeSeries: {
    title: "Rep conversion",
    projectionStartIndex: -1,
    series: [{ label: "Demo to proposal", tone: "positive" }],
    points: [
      { label: "Ava", values: [62] },
      { label: "Ben", values: [54] },
      { label: "Cam", values: [48] },
      { label: "Dia", values: [67] },
      { label: "Eli", values: [51] },
    ],
  },
});

const salesSecurityReviewData = exampleWidgetData({
  title: "Security review queue",
  subtitle: "Enterprise deal blockers",
  recommendedVisualization: "table",
  table: {
    title: "Reviews blocking deals",
    columns: ["Deal", "Value", "Age", "Needed"],
    rows: [
      { cells: ["Acme AI", "$146k", "12d", "SOC 2"] },
      { cells: ["Vector Bank", "$212k", "18d", "DPA redlines"] },
      { cells: ["Nimbus Labs", "$88k", "7d", "Pen test"] },
      { cells: ["Orbit Health", "$119k", "15d", "HIPAA packet"] },
    ],
  },
});

const opsSupportData = exampleWidgetData({
  title: "Support load",
  subtitle: "Tickets and AI deflection",
  recommendedVisualization: "line_chart",
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
});

const opsHiringData = exampleWidgetData({
  title: "Hiring and onboarding",
  subtitle: "Pipeline and ramp by role",
  recommendedVisualization: "bar_chart",
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
});

const opsVendorData = exampleWidgetData({
  title: "Vendor spend",
  subtitle: "Renewals and unused seats",
  recommendedVisualization: "table",
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
});

const opsBottleneckData = exampleWidgetData({
  title: "Process bottlenecks",
  subtitle: "Owners across functions",
  recommendedVisualization: "insights",
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
});

const opsOnboardingData = exampleWidgetData({
  title: "Customer onboarding",
  subtitle: "Time to value blockers",
  recommendedVisualization: "table",
  table: {
    title: "Onboarding health",
    columns: ["Stage", "Accounts", "Median age", "Blocker"],
    rows: [
      { cells: ["Kickoff", "18", "2d", "None"] },
      { cells: ["Data connect", "12", "6d", "Admin access"] },
      { cells: ["First board", "9", "4d", "Metric mapping"] },
      { cells: ["Rollout", "5", "11d", "Champion time"] },
    ],
  },
});

const opsInvoiceData = exampleWidgetData({
  title: "Invoice approvals",
  subtitle: "Overdue payments and cash timing",
  recommendedVisualization: "metrics",
  metrics: [
    { label: "Pending", value: "$84k", delta: "19 invoices", tone: "warning" },
    { label: "Overdue", value: "$21k", delta: "-$8k WoW", tone: "positive" },
    { label: "Avg approval", value: "2.6d", delta: "-0.9d", tone: "positive" },
    { label: "Cash impact", value: "$11k", delta: "This month", tone: "neutral" },
  ],
});

const opsComplianceData = exampleWidgetData({
  title: "Compliance throughput",
  subtitle: "Questionnaire aging",
  recommendedVisualization: "bar_chart",
  timeSeries: {
    title: "Security questionnaires",
    projectionStartIndex: -1,
    series: [
      { label: "Open", tone: "warning" },
      { label: "Closed", tone: "positive" },
    ],
    points: [
      { label: "W1", values: [9, 6] },
      { label: "W2", values: [11, 8] },
      { label: "W3", values: [7, 10] },
      { label: "W4", values: [5, 12] },
    ],
  },
});

const opsSaasUtilizationData = exampleWidgetData({
  title: "SaaS utilization",
  subtitle: "Seats and consolidation",
  recommendedVisualization: "table",
  table: {
    title: "Seat utilization",
    columns: ["Tool", "Paid seats", "Active", "Action"],
    rows: [
      { cells: ["CRM", "84", "61", "Cut 12 seats"] },
      { cells: ["Support", "38", "34", "Keep"] },
      { cells: ["Analytics", "52", "23", "Consolidate"] },
      { cells: ["Docs", "112", "97", "Archive guests"] },
    ],
  },
});

const opsSlaData = exampleWidgetData({
  title: "SLA scorecard",
  subtitle: "Weekly misses and causes",
  recommendedVisualization: "metrics",
  metrics: [
    { label: "Support SLA", value: "94%", delta: "+3pp", tone: "positive" },
    { label: "Onboarding SLA", value: "86%", delta: "-4pp", tone: "warning" },
    { label: "Finance SLA", value: "91%", delta: "+1pp", tone: "positive" },
    { label: "Misses", value: "11", delta: "Access delays", tone: "warning" },
  ],
});

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: "founder",
    name: "Founder",
    widgets: [
      widget(
        "runway",
        "show founder runway forecast with cash remaining, net burn, and next financing date",
        gridPosition(0, 0),
        founderRunwayData,
      ),
      widget(
        "arr",
        "show founder ARR growth, expansion, contraction, and net retention",
        gridPosition(1, 0),
        founderArrData,
      ),
      widget(
        "burn",
        "show founder burn breakdown by payroll, AI infra, GTM, and vendors",
        gridPosition(2, 0),
        founderBurnData,
      ),
      widget(
        "efficiency",
        "show founder AI spend efficiency and wasted token rate by workflow",
        gridPosition(0, 1),
        founderEfficiencyData,
      ),
      widget(
        "customer-risk",
        "show founder top customer concentration and renewal risk",
        gridPosition(1, 1),
        founderCustomerRiskData,
      ),
      widget(
        "activation",
        "show founder activation funnel from signup to paid conversion",
        gridPosition(2, 1),
        founderActivationData,
      ),
      widget(
        "gross-margin",
        "show founder gross margin impact from model and infrastructure costs",
        gridPosition(0, 2),
        founderGrossMarginData,
      ),
      widget(
        "fundraising",
        "show founder fundraising readiness milestones and diligence gaps",
        gridPosition(1, 2),
        founderFundraisingData,
      ),
      widget(
        "priorities",
        "show founder weekly priorities with blockers and owners",
        gridPosition(2, 2),
        founderPrioritiesData,
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
      ),
      widget(
        "incidents",
        "show engineering incident load by severity and MTTR",
        gridPosition(1, 0),
        engineeringIncidentsData,
      ),
      widget(
        "models",
        "show engineering model latency, retries, and cost by workflow",
        gridPosition(2, 0),
        engineeringModelData,
      ),
      widget(
        "quality",
        "show engineering release quality, eval pass rate, and rollback risk",
        gridPosition(0, 1),
        engineeringQualityData,
      ),
      widget(
        "deployments",
        "show engineering deployment health with failed builds and lead time",
        gridPosition(1, 1),
        engineeringDeploymentData,
      ),
      widget(
        "pr-review",
        "show engineering PR review bottlenecks by repo and reviewer",
        gridPosition(2, 1),
        engineeringPrReviewData,
      ),
      widget(
        "tests",
        "show engineering test coverage and flaky test hotspots",
        gridPosition(0, 2),
        engineeringTestsData,
      ),
      widget(
        "agent-evals",
        "show engineering AI agent eval coverage by critical workflow",
        gridPosition(1, 2),
        engineeringAgentEvalData,
      ),
      widget(
        "infra",
        "show engineering infrastructure cost and saturation risks by service",
        gridPosition(2, 2),
        engineeringInfraData,
      ),
    ],
  },
  {
    id: "sales",
    name: "Sales",
    widgets: [
      widget(
        "pipeline",
        "show sales pipeline coverage by stage for the current quarter",
        gridPosition(0, 0),
        salesPipelineData,
      ),
      widget(
        "win-rate",
        "show sales win rate and sales cycle trend by month",
        gridPosition(1, 0),
        salesWinRateData,
      ),
      widget(
        "forecast",
        "show sales revenue forecast by segment with commit and best case",
        gridPosition(2, 0),
        salesForecastData,
      ),
      widget(
        "stuck-deals",
        "show sales stuck deals, blocker reason, and next best action",
        gridPosition(0, 1),
        salesStuckDealsData,
      ),
      widget(
        "lead-source",
        "show sales lead source ROI and CAC payback by channel",
        gridPosition(1, 1),
        salesLeadSourceData,
      ),
      widget(
        "outbound",
        "show sales outbound sequence performance and AI-personalized reply rate",
        gridPosition(2, 1),
        salesOutboundData,
      ),
      widget(
        "expansion",
        "show sales expansion pipeline and renewal risk by account",
        gridPosition(0, 2),
        salesExpansionData,
      ),
      widget(
        "demo-conversion",
        "show sales demo-to-proposal conversion by rep",
        gridPosition(1, 2),
        salesDemoConversionData,
      ),
      widget(
        "security-review",
        "show sales security review queue blocking enterprise deals",
        gridPosition(2, 2),
        salesSecurityReviewData,
      ),
    ],
  },
  {
    id: "ops",
    name: "Ops",
    widgets: [
      widget(
        "support",
        "show ops support load and AI deflection trend",
        gridPosition(0, 0),
        opsSupportData,
      ),
      widget(
        "hiring",
        "show ops hiring pipeline and onboarding ramp by role",
        gridPosition(1, 0),
        opsHiringData,
      ),
      widget(
        "vendors",
        "show ops vendor spend, renewals, and unused seats",
        gridPosition(2, 0),
        opsVendorData,
      ),
      widget(
        "bottlenecks",
        "show ops process bottlenecks and owners across support, sales, and finance",
        gridPosition(0, 1),
        opsBottleneckData,
      ),
      widget(
        "onboarding",
        "show ops customer onboarding health and time-to-value blockers",
        gridPosition(1, 1),
        opsOnboardingData,
      ),
      widget(
        "invoices",
        "show ops invoice approvals, overdue payments, and cash timing",
        gridPosition(2, 1),
        opsInvoiceData,
      ),
      widget(
        "compliance",
        "show ops compliance questionnaire throughput and aging",
        gridPosition(0, 2),
        opsComplianceData,
      ),
      widget(
        "saas-utilization",
        "show ops SaaS seat utilization and consolidation opportunities",
        gridPosition(1, 2),
        opsSaasUtilizationData,
      ),
      widget(
        "sla",
        "show ops weekly SLA scorecard with misses and root causes",
        gridPosition(2, 2),
        opsSlaData,
      ),
    ],
  },
];

export function createBoardFromTemplate(template: BoardTemplate, now = Date.now()): CanvasBoard {
  return {
    id: template.id,
    name: template.name,
    templateId: template.id,
    templateVersion: BOARD_TEMPLATE_VERSION,
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
