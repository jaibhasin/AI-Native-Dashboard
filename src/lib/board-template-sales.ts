import type { BoardTemplate } from "@/lib/board-template-core";
import {
  buildWidgetCluster,
  exampleWidgetData,
  flattenClusters,
  TEMPLATE_DISCLOSURE,
} from "@/lib/board-template-core";

const salesPipelineData = exampleWidgetData({
  title: "Pipeline coverage",
  subtitle: "Current quarter · commit vs target",
  recommendedVisualization: "bar_chart",
  disclosure: TEMPLATE_DISCLOSURE,
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
      { label: "Closed", values: [92] },
    ],
  },
});

const salesWinRateData = exampleWidgetData({
  title: "Win rate trend",
  subtitle: "Last 6 months · sales cycle",
  recommendedVisualization: "line_chart",
  disclosure: TEMPLATE_DISCLOSURE,
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
  subtitle: "Commit and best case by segment",
  recommendedVisualization: "table",
  disclosure: TEMPLATE_DISCLOSURE,
  table: {
    title: "Forecast by segment",
    columns: ["Segment", "Commit", "Best case", "Risk", "Owner"],
    rows: [
      { cells: ["Seed startups", "$92k", "$138k", "Low", "Ava"] },
      { cells: ["Scaleups", "$186k", "$264k", "Medium", "Ben"] },
      { cells: ["Enterprise pilots", "$72k", "$188k", "High", "Cam"] },
      { cells: ["Expansion", "$114k", "$142k", "Low", "Dia"] },
      { cells: ["Partner-sourced", "$64k", "$118k", "Medium", "Eli"] },
    ],
  },
});

const salesStuckDealsData = exampleWidgetData({
  title: "Stuck deals",
  subtitle: "Blockers and recommended actions",
  recommendedVisualization: "insights",
  disclosure: TEMPLATE_DISCLOSURE,
  insights: [
    {
      label: "Security reviews slow expansion",
      detail: "Five high-value deals wait on vendor questionnaires — route to one owner with next step written.",
      tone: "warning",
    },
    {
      label: "Champion silence is rising",
      detail: "Three demos have no buyer reply after pricing — recommend mutual-intro or ROI proof follow-up.",
      tone: "negative",
    },
    {
      label: "AI ROI proof helps closes",
      detail: "Deals with workflow savings attached close 9 days faster — attach savings to stuck commit deals.",
      tone: "positive",
    },
    {
      label: "Legal redlines stall enterprise",
      detail: "Two commit deals paused on DPA language — escalate to one legal owner.",
      tone: "warning",
    },
  ],
});

const salesLeadSourceData = exampleWidgetData({
  title: "Lead source ROI",
  subtitle: "CAC payback by channel",
  recommendedVisualization: "table",
  disclosure: TEMPLATE_DISCLOSURE,
  table: {
    title: "Channel economics",
    columns: ["Channel", "Pipeline", "CAC payback", "ROI", "Action"],
    rows: [
      { cells: ["Founder outbound", "$214k", "5.2 mo", "High", "Scale"] },
      { cells: ["Content", "$164k", "7.8 mo", "Medium", "Keep"] },
      { cells: ["Partners", "$286k", "4.6 mo", "High", "Expand"] },
      { cells: ["Paid search", "$92k", "13.1 mo", "Low", "Trim"] },
      { cells: ["Events", "$118k", "8.4 mo", "Medium", "Test"] },
    ],
  },
});

const salesOutboundData = exampleWidgetData({
  title: "Outbound sequences",
  subtitle: "AI-personalized reply rate",
  recommendedVisualization: "bar_chart",
  disclosure: TEMPLATE_DISCLOSURE,
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
      { label: "Case study", values: [22, 10] },
    ],
  },
});

const salesExpansionData = exampleWidgetData({
  title: "Expansion pipeline",
  subtitle: "Renewal risk by account",
  recommendedVisualization: "table",
  disclosure: TEMPLATE_DISCLOSURE,
  table: {
    title: "Expansion and renewal watch",
    columns: ["Account", "Upside", "Renewal", "Risk", "Champion"],
    rows: [
      { cells: ["Northstar AI", "$72k", "Aug", "Low", "Active"] },
      { cells: ["Mercury Ops", "$54k", "Jul", "High", "Quiet"] },
      { cells: ["Kite Health", "$88k", "Sep", "Medium", "Active"] },
      { cells: ["BrightPath", "$31k", "Oct", "Low", "Active"] },
      { cells: ["Vector Bank", "$96k", "Aug", "High", "Blocked"] },
    ],
  },
});

const salesDemoConversionData = exampleWidgetData({
  title: "Demo conversion",
  subtitle: "Demo to proposal by rep",
  recommendedVisualization: "bar_chart",
  disclosure: TEMPLATE_DISCLOSURE,
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
  disclosure: TEMPLATE_DISCLOSURE,
  table: {
    title: "Reviews blocking deals",
    columns: ["Deal", "Value", "Age", "Needed", "Owner"],
    rows: [
      { cells: ["Acme AI", "$146k", "12d", "SOC 2", "Ops"] },
      { cells: ["Vector Bank", "$212k", "18d", "DPA redlines", "Legal"] },
      { cells: ["Nimbus Labs", "$88k", "7d", "Pen test", "Security"] },
      { cells: ["Orbit Health", "$119k", "15d", "HIPAA packet", "Ops"] },
      { cells: ["Summit Data", "$134k", "9d", "Subprocessors", "Ops"] },
    ],
  },
});

const salesClusters = [
  buildWidgetCluster("pipeline", "show sales pipeline coverage by stage for the current quarter", 0, 0, salesPipelineData),
  buildWidgetCluster("win-rate", "show sales win rate and sales cycle trend by month", 1, 0, salesWinRateData),
  buildWidgetCluster(
    "forecast",
    "show sales revenue forecast by segment with commit and best case",
    2,
    0,
    salesForecastData,
  ),
  buildWidgetCluster(
    "stuck-deals",
    "summarize sales stuck deals with blockers and recommended actions",
    0,
    1,
    salesStuckDealsData,
  ),
  buildWidgetCluster("lead-source", "show sales lead source ROI and CAC payback by channel", 1, 1, salesLeadSourceData),
  buildWidgetCluster(
    "outbound",
    "show sales outbound sequence performance and AI-personalized reply rate",
    2,
    1,
    salesOutboundData,
  ),
  buildWidgetCluster(
    "expansion",
    "show sales expansion pipeline and renewal risk by account",
    0,
    2,
    salesExpansionData,
  ),
  buildWidgetCluster("demo-conversion", "show sales demo-to-proposal conversion by rep", 1, 2, salesDemoConversionData),
  buildWidgetCluster(
    "security-review",
    "show sales security review queue blocking enterprise deals",
    2,
    2,
    salesSecurityReviewData,
  ),
];

export const salesBoardTemplate: BoardTemplate = {
  id: "sales",
  name: "Sales",
  ...flattenClusters(salesClusters),
};
