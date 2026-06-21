import type { WidgetAnnotationSupplement } from "@/lib/board-template-annotations";

export type EngineeringWidgetSpec = {
  column: 0 | 1 | 2;
  id: string;
  prompt: string;
  row: 0 | 1 | 2;
  supplements?: WidgetAnnotationSupplement[];
};

const disclosure = (source: string) =>
  `Preview data · intended source: ${source}. Use AI-generated dummy preview data only.`;

export const ENGINEERING_BOARD_ID = "engineering";
export const ENGINEERING_BOARD_NAME = "Engineering";

export const engineeringWidgetSpecs: EngineeringWidgetSpec[] = [
  {
    id: "token-spend",
    column: 0,
    row: 0,
    prompt: [
      "Show engineering token spend with total tokens used, total cost, and an 8-week trend of token volume and spend.",
      "Use composite layout with headline metrics plus a line chart.",
      `dataDisclosure must be exactly: "${disclosure("OpenAI Usage API, Anthropic Console")}"`,
      "Include believable engineering team names only if needed in supporting copy.",
    ].join(" "),
  },
  {
    id: "bugs-fixed",
    column: 1,
    row: 0,
    prompt: [
      "Show engineering bugs fixed this sprint with weekly bugs-fixed trend over the last 6 weeks.",
      "Use composite layout with sprint count metrics and a line chart.",
      `dataDisclosure must be exactly: "${disclosure("Linear, Jira")}"`,
    ].join(" "),
  },
  {
    id: "prs-merged",
    column: 2,
    row: 0,
    prompt: [
      "Show engineering PRs merged with monthly total and sprint-by-sprint merged PR trend over 6 sprints.",
      "Use composite layout with merged PR metrics and a line chart.",
      `dataDisclosure must be exactly: "${disclosure("GitHub")}"`,
    ].join(" "),
  },
  {
    id: "project-progress",
    column: 0,
    row: 1,
    prompt: [
      "Show engineering project progress for 3 to 4 active projects as percent complete over 6 weeks.",
      "Use composite layout with a multi-series line chart for project completion percentages.",
      "Include milestone status if helpful.",
      `dataDisclosure must be exactly: "${disclosure("Linear, Jira")}"`,
      "Use project names like Auth refactor, Billing migration, and Agent platform.",
    ].join(" "),
  },
  {
    id: "loc-committed",
    column: 1,
    row: 1,
    prompt: [
      "Show lines of code committed by each engineer this month for Maya, Ravi, Eli, Nora, and Sam.",
      "Use bar_chart layout.",
      `dataDisclosure must be exactly: "${disclosure("GitHub")}"`,
    ].join(" "),
  },
  {
    id: "ai-vs-human-code",
    column: 2,
    row: 1,
    prompt: [
      "Show AI-assisted vs human-written code contribution as a donut chart split with supporting metrics.",
      "Use donut_chart as recommendedVisualization and populate donut.segments with AI-assisted and Human-written shares.",
      `dataDisclosure must be exactly: "${disclosure("GitHub, Cursor, Copilot telemetry")}"`,
    ].join(" "),
  },
  {
    id: "cicd-health",
    column: 1,
    row: 2,
    prompt: [
      "Show engineering CI/CD pipeline health with success rate, failed runs, average duration, and deploy frequency.",
      "Use composite layout with pipeline metrics and a weekly success-rate or duration trend.",
      `dataDisclosure must be exactly: "${disclosure("GitHub Actions, Vercel")}"`,
    ].join(" "),
  },
];
