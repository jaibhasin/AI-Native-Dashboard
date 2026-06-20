import type { BoardTemplate } from "@/lib/board-template-core";
import { exampleWidgetData, gridPosition, note, notePosition, TEMPLATE_DISCLOSURE, widget } from "@/lib/board-template-core";

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
});

const engineeringIncidentsData = exampleWidgetData({
  title: "Incident load",
  subtitle: "Severity, volume, and MTTR",
  recommendedVisualization: "composite",
  disclosure: TEMPLATE_DISCLOSURE,
  metrics: [
    { label: "MTTR", value: "42m", delta: "-11m WoW", tone: "positive" },
    { label: "P0/P1 this week", value: "2", delta: "Down from 4", tone: "positive" },
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
    ],
  },
});

export const engineeringBoardTemplate: BoardTemplate = {
  id: "engineering",
  name: "Engineering",
  notes: [
    note(
      "brief",
      "This week",
      "Balance shipping speed with product eval coverage and inference cost. S6 merged 86 PRs with escaped bugs down to 4.",
      "blue",
      notePosition(0),
    ),
    note(
      "watch",
      "Risk to watch",
      "Maya has 12 PRs waiting on web-app and Web surface shows 9 flaky tests — unblock reviewers before adding release process.",
      "amber",
      notePosition(1),
    ),
    note(
      "next-move",
      "Next move",
      "Close the research-agent eval gap (68% coverage) before the next deployment window. Product evals are taste made executable here.",
      "green",
      notePosition(2),
    ),
  ],
  widgets: [
    widget("velocity", "show engineering velocity across recent sprints", gridPosition(0, 0), engineeringVelocityData),
    widget(
      "incidents",
      "show engineering incident load by severity and MTTR",
      gridPosition(1, 0),
      engineeringIncidentsData,
    ),
    widget(
      "models",
      "show engineering P95 latency, model routing, retries, and cost per agent run by workflow",
      gridPosition(2, 0),
      engineeringModelData,
    ),
    widget(
      "quality",
      "show engineering product eval pass rate, release readiness, and rollback risk",
      gridPosition(0, 1),
      engineeringQualityData,
    ),
    widget(
      "deployments",
      "show engineering deployment health with failed builds and lead time",
      gridPosition(1, 1),
      engineeringDeploymentData,
    ),
    widget(
      "pr-review",
      "show engineering PR review bottlenecks by repo and reviewer",
      gridPosition(2, 1),
      engineeringPrReviewData,
    ),
    widget(
      "tests",
      "show engineering test coverage and flaky test hotspots",
      gridPosition(0, 2),
      engineeringTestsData,
    ),
    widget(
      "agent-evals",
      "show engineering product eval coverage by critical agent workflow",
      gridPosition(1, 2),
      engineeringAgentEvalData,
    ),
    widget(
      "infra",
      "show engineering inference spend and infrastructure saturation risks by service",
      gridPosition(2, 2),
      engineeringInfraData,
    ),
  ],
};
