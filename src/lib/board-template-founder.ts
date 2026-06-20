import type { BoardTemplate } from "@/lib/board-template-core";
import {
  exampleWidgetData,
  FOUNDER_NOTE_HEIGHT,
  FOUNDER_NOTE_WIDTH,
  founderNotePosition,
  gridPositionSpan,
  noteSized,
  widgetSized,
} from "@/lib/board-template-core";

const TEMPLATE_DISCLOSURE = "Preview";

const founderRunwayData = exampleWidgetData({
  title: "Runway forecast",
  subtitle: "14.8 months runway at current burn",
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
  subtitle: "$1.82M ARR · +34% YoY",
  recommendedVisualization: "line_chart",
  disclosure: TEMPLATE_DISCLOSURE,
  timeSeries: {
    title: "ARR trajectory",
    projectionStartIndex: 5,
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
      { label: "Jul", values: [1980, 178] },
      { label: "Aug", values: [2140, 192] },
    ],
  },
});

const founderEfficiencyData = exampleWidgetData({
  title: "AI spend efficiency",
  subtitle: "Useful output vs token waste",
  recommendedVisualization: "metrics",
  disclosure: TEMPLATE_DISCLOSURE,
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
  disclosure: TEMPLATE_DISCLOSURE,
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
  disclosure: TEMPLATE_DISCLOSURE,
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
  disclosure: TEMPLATE_DISCLOSURE,
  metrics: [
    { label: "Gross margin", value: "72%", delta: "+3pp QoQ", tone: "positive" },
    { label: "Model COGS", value: "$18.6k", delta: "-11% MoM", tone: "positive" },
    { label: "Infra COGS", value: "$24.1k", delta: "+2% MoM", tone: "neutral" },
    { label: "Target margin", value: "75%", delta: "3pp gap", tone: "warning" },
  ],
});

const founderFundraisingData = exampleWidgetData({
  title: "Fundraising readiness",
  subtitle: "Board memo · Series A prep",
  recommendedVisualization: "insights",
  disclosure: TEMPLATE_DISCLOSURE,
  insights: [
    {
      label: "Growth narrative is holding",
      detail: "Weekly active teams up 34% since pricing change. Net retention at 118%.",
      tone: "positive",
    },
    {
      label: "SOC 2 is the gating item",
      detail: "Evidence packet and subprocessor list need one owner before partner meetings.",
      tone: "warning",
    },
    {
      label: "Margin story is improving",
      detail: "Routing low-risk workflows to cheaper models lifted gross margin 3pp this quarter.",
      tone: "positive",
    },
  ],
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
      { cells: ["Cut AI waste", "CTO", "On track", "Eval signoff"] },
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
      "Runway is healthy at 14.8 months. Focus on closing seed lead and tightening gross margin before fundraise conversations.",
      "blue",
      { ...founderNotePosition(0), height: FOUNDER_NOTE_HEIGHT, width: FOUNDER_NOTE_WIDTH },
    ),
    noteSized(
      "watch",
      "Risk to watch",
      "Mercury Ops renews in July with High risk flag. Gross margin is the quiet constraint — AI infra savings compound faster than another price tweak.",
      "amber",
      { ...founderNotePosition(1), height: FOUNDER_NOTE_HEIGHT, width: FOUNDER_NOTE_WIDTH },
    ),
    noteSized(
      "next-move",
      "Monday action",
      "Assign SOC 2 evidence owner before partner calls. Review fundraising readiness once priority blockers have owners.",
      "green",
      { ...founderNotePosition(2), height: FOUNDER_NOTE_HEIGHT, width: FOUNDER_NOTE_WIDTH },
    ),
  ],
  widgets: [
    widgetSized(
      "runway",
      "show founder runway forecast with cash remaining, net burn, and next financing date",
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
      "show founder AI spend efficiency and wasted token rate by workflow",
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
      "show founder activation funnel from signup to paid conversion",
      gridPositionSpan(2, 1),
      founderActivationData,
    ),
    widgetSized(
      "gross-margin",
      "show founder gross margin impact from model and infrastructure costs",
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
