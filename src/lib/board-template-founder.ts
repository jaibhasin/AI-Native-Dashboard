import type { BoardTemplate } from "@/lib/board-template-core";
import { exampleWidgetData, gridPosition, note, notePosition, widget } from "@/lib/board-template-core";

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

export const founderBoardTemplate: BoardTemplate = {
  id: "founder",
  name: "Founder",
  notes: [
    note(
      "brief",
      "Board brief",
      "Keep runway, ARR, and customer risk visible together before making hiring or fundraise calls.",
      "blue",
      notePosition(0),
    ),
    note(
      "watch",
      "Watch item",
      "Gross margin is the quiet constraint: AI infra savings compound faster than another small price change.",
      "amber",
      notePosition(1),
    ),
    note(
      "next-move",
      "Next move",
      "Review fundraising readiness after the priority blockers are assigned owners for the week.",
      "green",
      notePosition(2),
    ),
  ],
  widgets: [
    widget("runway", "show founder runway forecast with cash remaining, net burn, and next financing date", gridPosition(0, 0), founderRunwayData),
    widget("arr", "show founder ARR growth, expansion, contraction, and net retention", gridPosition(1, 0), founderArrData),
    widget("burn", "show founder burn breakdown by payroll, AI infra, GTM, and vendors", gridPosition(2, 0), founderBurnData),
    widget("efficiency", "show founder AI spend efficiency and wasted token rate by workflow", gridPosition(0, 1), founderEfficiencyData),
    widget("customer-risk", "show founder top customer concentration and renewal risk", gridPosition(1, 1), founderCustomerRiskData),
    widget("activation", "show founder activation funnel from signup to paid conversion", gridPosition(2, 1), founderActivationData),
    widget("gross-margin", "show founder gross margin impact from model and infrastructure costs", gridPosition(0, 2), founderGrossMarginData),
    widget("fundraising", "show founder fundraising readiness milestones and diligence gaps", gridPosition(1, 2), founderFundraisingData),
    widget("priorities", "show founder weekly priorities with blockers and owners", gridPosition(2, 2), founderPrioritiesData),
  ],
};
