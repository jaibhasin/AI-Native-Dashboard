import type { BoardTemplate } from "@/lib/board-template-core";
import { exampleWidgetData, gridPosition, note, notePosition, widget } from "@/lib/board-template-core";

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

export const engineeringBoardTemplate: BoardTemplate = {
  id: "engineering",
  name: "Engineering",
  notes: [
    note("brief", "Board brief", "Use this board to balance shipping speed against reliability, eval coverage, and AI runtime cost.", "blue", notePosition(0)),
    note("watch", "Watch item", "PR review and flaky tests are linked; unblock reviewers before adding more release process.", "rose", notePosition(1)),
    note("next-move", "Next move", "Pick one critical agent workflow and close the eval gap before the next deployment window.", "green", notePosition(2)),
  ],
  widgets: [
    widget("velocity", "show engineering velocity across recent sprints", gridPosition(0, 0), engineeringVelocityData),
    widget("incidents", "show engineering incident load by severity and MTTR", gridPosition(1, 0), engineeringIncidentsData),
    widget("models", "show engineering model latency, retries, and cost by workflow", gridPosition(2, 0), engineeringModelData),
    widget("quality", "show engineering release quality, eval pass rate, and rollback risk", gridPosition(0, 1), engineeringQualityData),
    widget("deployments", "show engineering deployment health with failed builds and lead time", gridPosition(1, 1), engineeringDeploymentData),
    widget("pr-review", "show engineering PR review bottlenecks by repo and reviewer", gridPosition(2, 1), engineeringPrReviewData),
    widget("tests", "show engineering test coverage and flaky test hotspots", gridPosition(0, 2), engineeringTestsData),
    widget("agent-evals", "show engineering AI agent eval coverage by critical workflow", gridPosition(1, 2), engineeringAgentEvalData),
    widget("infra", "show engineering infrastructure cost and saturation risks by service", gridPosition(2, 2), engineeringInfraData),
  ],
};

