import type { BoardTemplate } from "@/lib/board-template-core";
import { exampleWidgetData, gridPosition, note, notePosition, widget } from "@/lib/board-template-core";

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

export const opsBoardTemplate: BoardTemplate = {
  id: "ops",
  name: "Ops",
  notes: [
    note("brief", "Board brief", "Track support, onboarding, vendors, invoices, and compliance as one operating rhythm.", "blue", notePosition(0)),
    note("watch", "Watch item", "Access delays are showing up across SLA misses, onboarding, and compliance throughput.", "rose", notePosition(1)),
    note("next-move", "Next move", "Consolidate unused SaaS seats before the next renewal cycle and apply savings to onboarding gaps.", "green", notePosition(2)),
  ],
  widgets: [
    widget("support", "show ops support load and AI deflection trend", gridPosition(0, 0), opsSupportData),
    widget("hiring", "show ops hiring pipeline and onboarding ramp by role", gridPosition(1, 0), opsHiringData),
    widget("vendors", "show ops vendor spend, renewals, and unused seats", gridPosition(2, 0), opsVendorData),
    widget("bottlenecks", "show ops process bottlenecks and owners across support, sales, and finance", gridPosition(0, 1), opsBottleneckData),
    widget("onboarding", "show ops customer onboarding health and time-to-value blockers", gridPosition(1, 1), opsOnboardingData),
    widget("invoices", "show ops invoice approvals, overdue payments, and cash timing", gridPosition(2, 1), opsInvoiceData),
    widget("compliance", "show ops compliance questionnaire throughput and aging", gridPosition(0, 2), opsComplianceData),
    widget("saas-utilization", "show ops SaaS seat utilization and consolidation opportunities", gridPosition(1, 2), opsSaasUtilizationData),
    widget("sla", "show ops weekly SLA scorecard with misses and root causes", gridPosition(2, 2), opsSlaData),
  ],
};

