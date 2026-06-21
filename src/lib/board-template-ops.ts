import type { BoardTemplate } from "@/lib/board-template-core";
import {
  buildWidgetCluster,
  exampleWidgetData,
  flattenClusters,
  TEMPLATE_DISCLOSURE,
} from "@/lib/board-template-core";

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
    columns: ["Role", "Hired", "Median ramp", "Blocker", "Owner"],
    rows: [
      { cells: ["Support", "2", "18d", "Playbook gaps", "Ops"] },
      { cells: ["Sales", "1", "24d", "CRM hygiene", "RevOps"] },
      { cells: ["Engineering", "3", "31d", "Agent eval setup", "CTO"] },
      { cells: ["Ops", "1", "14d", "None", "Ops"] },
      { cells: ["Design", "1", "21d", "Tooling access", "Ops"] },
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
    columns: ["Vendor", "Monthly", "Renewal", "Action", "Owner"],
    rows: [
      { cells: ["CRM", "$4.8k", "Jul 12", "Right-size seats", "RevOps"] },
      { cells: ["Data warehouse", "$6.1k", "Jul 28", "Commit discount", "Finance"] },
      { cells: ["Support suite", "$3.4k", "Aug 04", "Review automations", "Support"] },
      { cells: ["Analytics", "$2.2k", "Aug 19", "Remove duplicates", "Ops"] },
      { cells: ["Security", "$1.9k", "Aug 26", "Renew as-is", "Ops"] },
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
    {
      label: "Access delays repeat",
      detail: "Admin access is the common blocker across onboarding and SLA misses.",
      tone: "negative",
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
    columns: ["Stage", "Accounts", "Median age", "Blocker", "Owner"],
    rows: [
      { cells: ["Kickoff", "18", "2d", "None", "CS"] },
      { cells: ["Data connect", "12", "6d", "Admin access", "CS"] },
      { cells: ["First board", "9", "4d", "Metric mapping", "CS"] },
      { cells: ["Rollout", "5", "11d", "Champion time", "CS"] },
      { cells: ["Expansion", "3", "8d", "Security review", "Sales"] },
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
      { label: "W5", values: [4, 13] },
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
    columns: ["Tool", "Paid seats", "Active", "Action", "Savings"],
    rows: [
      { cells: ["CRM", "84", "61", "Cut 12 seats", "$1.4k/mo"] },
      { cells: ["Support", "38", "34", "Keep", "$0"] },
      { cells: ["Analytics", "52", "23", "Consolidate", "$2.1k/mo"] },
      { cells: ["Docs", "112", "97", "Archive guests", "$0.8k/mo"] },
      { cells: ["Design", "28", "19", "Review licenses", "$0.6k/mo"] },
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

const opsClusters = [
  buildWidgetCluster("support", "show ops support load and AI deflection trend", 0, 0, opsSupportData),
  buildWidgetCluster(
    "hiring",
    "show ops hiring pipeline and onboarding ramp time-to-productivity by role",
    1,
    0,
    opsHiringData,
  ),
  buildWidgetCluster("vendors", "show ops vendor spend, renewals, and unused seats", 2, 0, opsVendorData),
  buildWidgetCluster(
    "bottlenecks",
    "show ops process bottlenecks and owners across support, sales, and finance",
    0,
    1,
    opsBottleneckData,
  ),
  buildWidgetCluster(
    "onboarding",
    "show ops customer onboarding health and time-to-value blockers",
    1,
    1,
    opsOnboardingData,
  ),
  buildWidgetCluster(
    "invoices",
    "show ops invoice approvals, overdue payments, and cash timing",
    2,
    1,
    opsInvoiceData,
  ),
  buildWidgetCluster(
    "compliance",
    "show ops compliance questionnaire throughput and aging",
    0,
    2,
    opsComplianceData,
  ),
  buildWidgetCluster(
    "saas-utilization",
    "show ops SaaS seat utilization and consolidation opportunities",
    1,
    2,
    opsSaasUtilizationData,
  ),
  buildWidgetCluster("sla", "show ops weekly SLA scorecard with misses and root causes", 2, 2, opsSlaData),
];

export const opsBoardTemplate: BoardTemplate = {
  id: "ops",
  name: "Ops",
  ...flattenClusters(opsClusters),
};
