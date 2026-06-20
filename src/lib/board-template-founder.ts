import type { BoardTemplate } from "@/lib/board-template-core";
import {
  exampleWidgetData,
  founderNotePositionSpan,
  gridPositionSpan,
  noteSized,
  TEMPLATE_DISCLOSURE,
  widgetSized,
} from "@/lib/board-template-core";

const founderRunwayData = exampleWidgetData({
  title: "Runway forecast",
  subtitle: "14.8 months runway · inference COGS in burn",
  recommendedVisualization: "composite",
  disclosure: TEMPLATE_DISCLOSURE,
  metrics: [
    { label: "Cash on hand", value: "$2.4M", delta: "14.8 mo runway", tone: "positive" },
    { label: "Net burn", value: "$162k", delta: "-7% MoM", tone: "positive" },
    { label: "Default alive", value: "Yes", delta: "At current plan", tone: "positive" },
    { label: "Next raise", value: "Jan 2027", delta: "Target close", tone: "warning" },
  ],
  timeSeries: {
    title: "Cash balance trend",
    projectionStartIndex: -1,
    series: [{ label: "Cash ($k)", tone: "positive" }],
    points: [
      { label: "Jan", values: [2840] },
      { label: "Feb", values: [2710] },
      { label: "Mar", values: [2588] },
      { label: "Apr", values: [2462] },
      { label: "May", values: [2431] },
      { label: "Jun", values: [2400] },
    ],
  },
});

const founderArrData = exampleWidgetData({
  title: "ARR growth",
  subtitle: "$1.82M ARR · NRR 118% · logo churn easing",
  recommendedVisualization: "composite",
  disclosure: TEMPLATE_DISCLOSURE,
  metrics: [{ label: "Net retention", value: "118%", delta: "+4pp QoQ", tone: "positive" }],
  timeSeries: {
    title: "ARR, expansion, and contraction",
    projectionStartIndex: 5,
    series: [
      { label: "ARR", tone: "positive" },
      { label: "Expansion ARR", tone: "neutral" },
      { label: "Contraction", tone: "warning" },
    ],
    points: [
      { label: "Jan", values: [1120, 84, 18] },
      { label: "Feb", values: [1245, 96, 16] },
      { label: "Mar", values: [1395, 108, 19] },
      { label: "Apr", values: [1510, 126, 14] },
      { label: "May", values: [1668, 143, 12] },
      { label: "Jun", values: [1820, 161, 11] },
      { label: "Jul", values: [1980, 178, 10] },
      { label: "Aug", values: [2140, 192, 9] },
    ],
  },
});

const founderEfficiencyData = exampleWidgetData({
  title: "Token efficiency",
  subtitle: "Inference cost per workflow · retry waste",
  recommendedVisualization: "composite",
  disclosure: TEMPLATE_DISCLOSURE,
  metrics: [
    { label: "Useful output", value: "87%", delta: "Token efficiency", tone: "positive" },
    { label: "Retry waste", value: "13%", delta: "-2pp MoM", tone: "positive" },
    { label: "Cost/workflow", value: "14¢", delta: "Blended avg", tone: "positive" },
  ],
  table: {
    title: "Cost per workflow",
    columns: ["Workflow", "Cost/run", "Retry waste", "Route tier"],
    rows: [
      { cells: ["Research agent", "$0.18", "4.1%", "Frontier"] },
      { cells: ["Support triage", "$0.04", "2.7%", "Small model"] },
      { cells: ["Code review", "$0.22", "5.6%", "Frontier"] },
      { cells: ["Sales enrich", "$0.11", "8.9%", "Routed"] },
    ],
  },
});

const founderCustomerRiskData = exampleWidgetData({
  title: "Customer concentration",
  subtitle: "Renewal and expansion risk",
  recommendedVisualization: "ranking",
  disclosure: TEMPLATE_DISCLOSURE,
  ranking: {
    title: "Top account exposure",
    items: [
      { label: "Northstar AI", value: "$212k", detail: "Renewal Aug", badge: "Low", tone: "positive" },
      { label: "Kite Health", value: "$184k", detail: "Renewal Sep", badge: "Medium", tone: "warning" },
      { label: "Mercury Ops", value: "$141k", detail: "Renewal Jul", badge: "High", tone: "negative" },
      { label: "BrightPath", value: "$96k", detail: "Renewal Oct", badge: "Low", tone: "positive" },
    ],
  },
});

const founderActivationData = exampleWidgetData({
  title: "PLG activation",
  subtitle: "Signup to paid · time-to-value",
  recommendedVisualization: "funnel",
  disclosure: TEMPLATE_DISCLOSURE,
  funnel: {
    title: "Activation funnel",
    steps: [
      { label: "Signup", value: 1240, dropoff: "", tone: "positive" },
      { label: "Connected data", value: 812, dropoff: "-35%", tone: "neutral" },
      { label: "First board", value: 604, dropoff: "-26%", tone: "neutral" },
      { label: "Team invite", value: 318, dropoff: "-47%", tone: "warning" },
      { label: "Paid", value: 142, dropoff: "-55%", tone: "positive" },
    ],
  },
});

const founderGrossMarginData = exampleWidgetData({
  title: "Gross margin",
  subtitle: "Inference COGS vs infra COGS",
  recommendedVisualization: "metrics",
  disclosure: TEMPLATE_DISCLOSURE,
  metrics: [
    { label: "Gross margin", value: "72%", delta: "+3pp QoQ", tone: "positive" },
    { label: "Inference COGS", value: "$18.6k", delta: "-11% MoM", tone: "positive" },
    { label: "Infra COGS", value: "$24.1k", delta: "+2% MoM", tone: "neutral" },
    { label: "Target margin", value: "75%", delta: "3pp gap", tone: "warning" },
  ],
});

const founderFundraisingData = exampleWidgetData({
  title: "Fundraising readiness",
  subtitle: "Series A prep · diligence gaps",
  recommendedVisualization: "timeline",
  disclosure: TEMPLATE_DISCLOSURE,
  milestones: {
    title: "Readiness milestones",
    items: [
      {
        label: "Usage growth story",
        detail: "Weekly active teams up 34% since pricing change.",
        status: "done",
      },
      {
        label: "SOC 2 evidence packet",
        detail: "Subprocessor list and evidence need one owner.",
        status: "blocked",
      },
      {
        label: "Margin proof",
        detail: "Model routing lifted margin 3pp without slowing agents.",
        status: "done",
      },
      {
        label: "Partner meetings",
        detail: "Seed lead intro scheduled for next week.",
        status: "active",
      },
    ],
  },
});

const founderPrioritiesData = exampleWidgetData({
  title: "Weekly priorities",
  subtitle: "Blockers and owners",
  recommendedVisualization: "table",
  disclosure: TEMPLATE_DISCLOSURE,
  table: {
    title: "Founder operating list",
    columns: ["Priority", "Owner", "Status", "Blocker"],
    rows: [
      { cells: ["Close seed lead", "CEO", "On track", "Partner call"] },
      { cells: ["Cut retry waste", "CTO", "On track", "Eval signoff"] },
      { cells: ["Launch pricing", "GTM", "At risk", "Billing copy"] },
      { cells: ["SOC 2 packet", "Ops", "Blocked", "Evidence owner"] },
    ],
  },
});

export const founderBoardTemplate: BoardTemplate = {
  id: "founder",
  name: "Founder",
  notes: [
    noteSized(
      "brief",
      "This week",
      "Runway is healthy at 14.8 months. Tokenmaxx model routing before the next hire — inference COGS down 11% MoM while ARR climbs.",
      "blue",
      { ...founderNotePositionSpan(0, 2, 1), height: 120 },
    ),
    noteSized(
      "watch",
      "Risk to watch",
      "Mercury Ops renews in July with High risk. Gross margin is the quiet constraint — routing low-risk workflows compounds faster than another price tweak.",
      "amber",
      { ...founderNotePositionSpan(2, 1, 1), height: 120 },
    ),
    noteSized(
      "next-move",
      "Next move",
      "Assign SOC 2 evidence owner before partner calls. Close the research-agent eval gap and review fundraising readiness once blockers have owners.",
      "green",
      { ...founderNotePositionSpan(0, 3, 0), height: 120 },
    ),
  ],
  widgets: [
    widgetSized(
      "runway",
      "show founder runway forecast with cash remaining, net burn, inference COGS, and next financing date",
      gridPositionSpan(0, 0, 2, 1),
      founderRunwayData,
    ),
    widgetSized(
      "arr",
      "show founder ARR growth, expansion, contraction, and net retention",
      gridPositionSpan(2, 0, 1, 1),
      founderArrData,
    ),
    widgetSized(
      "efficiency",
      "show founder token efficiency and inference cost per workflow with retry waste breakdown",
      gridPositionSpan(0, 1),
      founderEfficiencyData,
    ),
    widgetSized(
      "customer-risk",
      "show founder top customer concentration and renewal risk",
      gridPositionSpan(1, 1),
      founderCustomerRiskData,
    ),
    widgetSized(
      "activation",
      "show founder PLG activation funnel from signup to paid conversion",
      gridPositionSpan(2, 1),
      founderActivationData,
    ),
    widgetSized(
      "gross-margin",
      "show founder gross margin impact from inference COGS and infrastructure costs",
      gridPositionSpan(0, 2),
      founderGrossMarginData,
    ),
    widgetSized(
      "fundraising",
      "show founder fundraising readiness milestones and diligence gaps",
      gridPositionSpan(1, 2),
      founderFundraisingData,
    ),
    widgetSized(
      "priorities",
      "show founder weekly priorities with blockers and owners",
      gridPositionSpan(2, 2),
      founderPrioritiesData,
    ),
  ],
};
