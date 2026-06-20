import type { BoardTemplate } from "@/lib/board-template-core";
import { exampleWidgetData, gridPosition, note, notePosition, TEMPLATE_DISCLOSURE, widget } from "@/lib/board-template-core";

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
  ],
});

const salesLeadSourceData = exampleWidgetData({
  title: "Lead source ROI",
  subtitle: "CAC payback by channel",
  recommendedVisualization: "table",
  disclosure: TEMPLATE_DISCLOSURE,
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
    columns: ["Deal", "Value", "Age", "Needed"],
    rows: [
      { cells: ["Acme AI", "$146k", "12d", "SOC 2"] },
      { cells: ["Vector Bank", "$212k", "18d", "DPA redlines"] },
      { cells: ["Nimbus Labs", "$88k", "7d", "Pen test"] },
      { cells: ["Orbit Health", "$119k", "15d", "HIPAA packet"] },
    ],
  },
});

export const salesBoardTemplate: BoardTemplate = {
  id: "sales",
  name: "Sales",
  notes: [
    note(
      "brief",
      "This week",
      "Read pipeline ($168k commit), win rate (28%), and expansion as one revenue view. ROI-proof sequences convert at 19% reply.",
      "blue",
      notePosition(0),
    ),
    note(
      "watch",
      "Risk to watch",
      "Vector Bank ($212k) has waited 18d on DPA redlines and Acme AI ($146k) is at 12d on SOC 2 — security queue is the enterprise choke point.",
      "amber",
      notePosition(1),
    ),
    note(
      "next-move",
      "Next move",
      "Route stuck commit deals to one owner with blocker reason and next best action written. Attach AI ROI proof to the three silent-champion demos.",
      "green",
      notePosition(2),
    ),
  ],
  widgets: [
    widget("pipeline", "show sales pipeline coverage by stage for the current quarter", gridPosition(0, 0), salesPipelineData),
    widget("win-rate", "show sales win rate and sales cycle trend by month", gridPosition(1, 0), salesWinRateData),
    widget(
      "forecast",
      "show sales revenue forecast by segment with commit and best case",
      gridPosition(2, 0),
      salesForecastData,
    ),
    widget(
      "stuck-deals",
      "summarize sales stuck deals with blockers and recommended actions",
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
};
