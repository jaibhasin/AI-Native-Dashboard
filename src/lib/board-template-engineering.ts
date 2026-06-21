import type { BoardTemplate } from "@/lib/board-template-core";
import {
  buildWidgetCluster,
  exampleWidgetData,
  flattenClusters,
  TEMPLATE_DISCLOSURE,
} from "@/lib/board-template-core";

const engineeringVelocityData = exampleWidgetData({
  title: "Engineering velocity",
  subtitle: "Past 6 sprints · shipped PRs",
  recommendedVisualization: "line_chart",
  disclosure: TEMPLATE_DISCLOSURE,
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
  insights: [
    {
      label: "Throughput is compounding",
      detail: "S6 merged 86 PRs while escaped bugs fell to 4 — the best sprint in the last two quarters.",
      tone: "positive",
    },
  ],
});

const engineeringIncidentsData = exampleWidgetData({
  title: "Incident load",
  subtitle: "Severity, volume, and MTTR",
  recommendedVisualization: "composite",
  disclosure: TEMPLATE_DISCLOSURE,
  metrics: [
    { label: "MTTR", value: "42m", delta: "-11m WoW", tone: "positive" },
    { label: "P0/P1 this week", value: "2", delta: "Down from 4", tone: "positive" },
    { label: "Repeat incidents", value: "1", delta: "Same root cause", tone: "warning" },
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
});

const engineeringModelData = exampleWidgetData({
  title: "Model reliability",
  subtitle: "P95 latency · routing tier · cost per run",
  recommendedVisualization: "table",
  disclosure: TEMPLATE_DISCLOSURE,
  table: {
    title: "Agent workflow health",
    columns: ["Workflow", "P95 latency", "Retry rate", "Cost/run", "Route tier"],
    rows: [
      { cells: ["Research agent", "7.8s", "4.1%", "$0.18", "Frontier"] },
      { cells: ["Support triage", "3.2s", "2.7%", "$0.04", "Small model"] },
      { cells: ["Code review", "9.4s", "5.6%", "$0.22", "Frontier"] },
      { cells: ["Sales enrich", "5.1s", "8.9%", "$0.11", "Routed"] },
      { cells: ["Billing assist", "4.6s", "3.2%", "$0.07", "Routed"] },
    ],
  },
});

const engineeringQualityData = exampleWidgetData({
  title: "Release quality",
  subtitle: "Product eval pass rate · rollback risk",
  recommendedVisualization: "composite",
  disclosure: TEMPLATE_DISCLOSURE,
  metrics: [{ label: "Eval pass rate", value: "91%", delta: "+6pp after routing", tone: "positive" }],
  insights: [
    {
      label: "Product evals recovered",
      detail: "Closed-loop routing lifted agent accuracy after the latest prompt cleanup.",
      tone: "positive",
    },
    {
      label: "Checkout flow needs review",
      detail: "Two newest eval failures cluster in billing-state transitions.",
      tone: "warning",
    },
    {
      label: "Rollback risk is low",
      detail: "No migration failures or schema drift in staging canary checks.",
      tone: "positive",
    },
    {
      label: "Canary coverage improved",
      detail: "Staging now mirrors 94% of production traffic shapes before release.",
      tone: "positive",
    },
  ],
});

const engineeringDeploymentData = exampleWidgetData({
  title: "Deployment health",
  subtitle: "Builds and lead time",
  recommendedVisualization: "metrics",
  disclosure: TEMPLATE_DISCLOSURE,
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
  disclosure: TEMPLATE_DISCLOSURE,
  table: {
    title: "Slow review queues",
    columns: ["Repo", "Median wait", "Reviewer", "Backlog", "Risk"],
    rows: [
      { cells: ["web-app", "8.2h", "Maya", "12 PRs", "High"] },
      { cells: ["agents", "11.4h", "Ravi", "9 PRs", "Medium"] },
      { cells: ["billing", "6.1h", "Nora", "5 PRs", "Low"] },
      { cells: ["infra", "14.8h", "Eli", "7 PRs", "High"] },
      { cells: ["analytics", "9.6h", "Sam", "6 PRs", "Medium"] },
    ],
  },
});

const engineeringTestsData = exampleWidgetData({
  title: "Test coverage",
  subtitle: "Coverage and flaky hotspots",
  recommendedVisualization: "bar_chart",
  disclosure: TEMPLATE_DISCLOSURE,
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
      { label: "Mobile", values: [69, 6] },
    ],
  },
});

const engineeringAgentEvalData = exampleWidgetData({
  title: "Agent eval coverage",
  subtitle: "Product evals by critical workflow",
  recommendedVisualization: "table",
  disclosure: TEMPLATE_DISCLOSURE,
  table: {
    title: "Eval matrix",
    columns: ["Workflow", "Coverage", "Pass rate", "Gap", "Owner"],
    rows: [
      { cells: ["Support triage", "91%", "94%", "Refund edge cases", "Mina"] },
      { cells: ["Code review", "76%", "89%", "Security findings", "Ravi"] },
      { cells: ["Research", "68%", "92%", "Source grounding", "Dev"] },
      { cells: ["Sales email", "83%", "88%", "Tone drift", "Ava"] },
      { cells: ["Billing assist", "79%", "90%", "Tax edge cases", "Nora"] },
    ],
  },
});

const engineeringInfraData = exampleWidgetData({
  title: "Infra saturation",
  subtitle: "Inference spend and saturation risk",
  recommendedVisualization: "bar_chart",
  disclosure: TEMPLATE_DISCLOSURE,
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
      { label: "Cache", values: [5, 49] },
    ],
  },
});

const engineeringClusters = [
  buildWidgetCluster("velocity", "show engineering velocity across recent sprints", 0, 0, engineeringVelocityData),
  buildWidgetCluster("incidents", "show engineering incident load by severity and MTTR", 1, 0, engineeringIncidentsData),
  buildWidgetCluster(
    "models",
    "show engineering P95 latency, model routing, retries, and cost per agent run by workflow",
    2,
    0,
    engineeringModelData,
  ),
  buildWidgetCluster(
    "quality",
    "show engineering product eval pass rate, release readiness, and rollback risk",
    0,
    1,
    engineeringQualityData,
  ),
  buildWidgetCluster(
    "deployments",
    "show engineering deployment health with failed builds and lead time",
    1,
    1,
    engineeringDeploymentData,
  ),
  buildWidgetCluster(
    "pr-review",
    "show engineering PR review bottlenecks by repo and reviewer",
    2,
    1,
    engineeringPrReviewData,
    [{ role: "action", title: "Unblock Maya", body: "Pair Eli on infra reviews before the Friday deploy window." }],
  ),
  buildWidgetCluster("tests", "show engineering test coverage and flaky test hotspots", 0, 2, engineeringTestsData),
  buildWidgetCluster(
    "agent-evals",
    "show engineering product eval coverage by critical agent workflow",
    1,
    2,
    engineeringAgentEvalData,
  ),
  buildWidgetCluster(
    "infra",
    "show engineering inference spend and infrastructure saturation risks by service",
    2,
    2,
    engineeringInfraData,
  ),
];

export const engineeringBoardTemplate: BoardTemplate = {
  id: "engineering",
  name: "Engineering",
  ...flattenClusters(engineeringClusters),
};
