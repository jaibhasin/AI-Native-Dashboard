import type { BoardTemplate } from "@/lib/board-template-core";
import { exampleWidgetData, gridPosition, note, notePosition, TEMPLATE_DISCLOSURE, widget } from "@/lib/board-template-core";

const opsSupportData = exampleWidgetData({
  title: "Support load",
  subtitle: "Ticket volume and AI deflection",
  recommendedVisualization: "line_chart",
  disclosure: TEMPLATE_DISCLOSURE,
  timeSeries: {
    title: "Tickets and deflection",
    projectionStartIndex: -1,
    series: [
      { label: "Created", tone: "warning" },
      { label: "Resolved", tone: "positive" },
      { label: "AI deflection %", tone: "positive" },
    ],
    points: [
      { label: "Mon", values: [58, 46, 22] },
      { label: "Tue", values: [64, 52, 24] },
      { label: "Wed", values: [49, 58, 31] },
      { label: "Thu", values: [43, 61, 34] },
      { label: "Fri", values: [38, 56, 37] },
    ],
  },
});

const opsHiringData = exampleWidgetData({
  title: "Onboarding ramp",
  subtitle: "Time-to-productivity by role",
  recommendedVisualization: "table",
  disclosure: TEMPLATE_DISCLOSURE,
  table: {
    title: "Ramp by role",
    columns: ["Role", "Hired", "Median ramp", "Blocker"],
    rows: [
      { cells: ["Support", "2", "18d", "Playbook gaps"] },
      { cells: ["Sales", "1", "24d", "CRM hygiene"] },
      { cells: ["Engineering", "3", "31d", "Agent eval setup"] },
      { cells: ["Ops", "1", "14d", "None"] },
    ],
  },
});

const opsVendorData = exampleWidgetData({
  title: "Vendor spend",
  subtitle: "Renewals and unused seats",
  recommendedVisualization: "table",
  disclosure: TEMPLATE_DISCLOSURE,
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
  subtitle: "Owners across support, sales, and finance",
  recommendedVisualization: "insights",
  disclosure: TEMPLATE_DISCLOSURE,
  insights: [
    {
      label: "Security intake needs an owner",
      detail: "Customer questionnaires wait longest when sales and eng both touch them — assign a single intake owner.",
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
  subtitle: "Time-to-value blockers",
  recommendedVisualization: "table",
  disclosure: TEMPLATE_DISCLOSURE,
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
  disclosure: TEMPLATE_DISCLOSURE,
  metrics: [
    { label: "Pending", value: "$84k", delta: "19 invoices", tone: "warning" },
    { label: "Overdue", value: "$21k", delta: "-$8k WoW", tone: "positive" },
    { label: "Avg approval", value: "2.6d", delta: "-0.9d", tone: "positive" },
    { label: "Cash impact", value: "$11k", delta: "This month", tone: "neutral" },
  ],
});

const opsComplianceData = exampleWidgetData({
  title: "Compliance throughput",
  subtitle: "Security questionnaire aging",
  recommendedVisualization: "bar_chart",
  disclosure: TEMPLATE_DISCLOSURE,
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
  subtitle: "Seat consolidation opportunities",
  recommendedVisualization: "table",
  disclosure: TEMPLATE_DISCLOSURE,
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
  subtitle: "Weekly misses and root causes",
  recommendedVisualization: "metrics",
  disclosure: TEMPLATE_DISCLOSURE,
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
    note(
      "brief",
      "This week",
      "AI deflection hit 37% Fri while tickets fell to 38 created. Track support, onboarding, vendors, and compliance as one rhythm.",
      "blue",
      notePosition(0),
    ),
    note(
      "watch",
      "Risk to watch",
      "Admin access delays show up in onboarding (12 accounts at data connect), compliance queue, and 11 SLA misses this week.",
      "amber",
      notePosition(1),
    ),
    note(
      "next-move",
      "Next move",
      "Consolidate 12 unused CRM seats and Analytics overlap before Jul renewals. Assign one security-intake owner for questionnaire backlog.",
      "green",
      notePosition(2),
    ),
  ],
  widgets: [
    widget("support", "show ops support load and AI deflection trend", gridPosition(0, 0), opsSupportData),
    widget(
      "hiring",
      "show ops hiring pipeline and onboarding ramp time-to-productivity by role",
      gridPosition(1, 0),
      opsHiringData,
    ),
    widget("vendors", "show ops vendor spend, renewals, and unused seats", gridPosition(2, 0), opsVendorData),
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
    widget("sla", "show ops weekly SLA scorecard with misses and root causes", gridPosition(2, 2), opsSlaData),
  ],
};
