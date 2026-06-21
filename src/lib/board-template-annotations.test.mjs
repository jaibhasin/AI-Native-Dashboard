import assert from "node:assert/strict";
import test from "node:test";
import { planWidgetAnnotations } from "./board-template-annotations.ts";

const DISCLOSURE = "Values are AI-generated preview data.";

function emptyTable() {
  return { columns: [], rows: [], title: "" };
}

function emptyTimeSeries() {
  return { points: [], projectionStartIndex: -1, series: [], title: "" };
}

function emptyFunnel() {
  return { steps: [], title: "" };
}

function emptyRanking() {
  return { items: [], title: "" };
}

function emptyMilestones() {
  return { items: [], title: "" };
}

function widgetData(overrides) {
  return {
    dataDisclosure: DISCLOSURE,
    formFields: [],
    funnel: emptyFunnel(),
    gauges: [],
    insights: [],
    metrics: [],
    milestones: emptyMilestones(),
    ranking: emptyRanking(),
    recommendedVisualization: "composite",
    subtitle: overrides.subtitle ?? "Preview context",
    table: emptyTable(),
    timeSeries: emptyTimeSeries(),
    title: overrides.title ?? "Widget",
    ...overrides,
  };
}

function noteRoles(notes) {
  return notes.map((note) => note.color);
}

function assertNoteCount(notes, min, max) {
  assert.ok(notes.length >= min, `expected at least ${min} notes, got ${notes.length}`);
  assert.ok(notes.length <= max, `expected at most ${max} notes, got ${notes.length}`);
}

function assertUniquePlacements(notes) {
  const placements = notes.map((note) => note.placement);
  assert.equal(new Set(placements).size, placements.length, "each note should occupy a unique side");
}

test("table with blocker column produces risk or action notes, not always four", () => {
  const data = widgetData({
    recommendedVisualization: "table",
    subtitle: "Current engineering projects",
    table: {
      title: "Projects",
      columns: ["Project", "Status", "Blocker", "Due"],
      rows: [
        { cells: ["Auth refactor", "At risk", "12 PRs waiting on infra review", "Jul 15"] },
        { cells: ["Billing migration", "On track", "None", "Jul 28"] },
        { cells: ["Platform cleanup", "On track", "None", "Aug 2"] },
      ],
    },
  });

  const notes = planWidgetAnnotations("show current engineering projects and status", data);

  assertNoteCount(notes, 1, 4);
  assert.ok(
    notes.some((note) => /auth refactor|infra review|jul/i.test(`${note.title} ${note.body}`)),
    "notes should reference table-specific content",
  );
  assert.ok(
    notes.every((note) => !/^(focus|source|watch|next)$/i.test(note.title)),
    "should not use the old mechanical slot titles",
  );
});

test("metrics-only widget returns a small set without filler context", () => {
  const data = widgetData({
    recommendedVisualization: "metrics",
    subtitle: "Weekly incident summary",
    metrics: [
      { label: "MTTR", value: "42m", delta: "-11m WoW", tone: "positive" },
      { label: "P0/P1 this week", value: "2", delta: "Down from 4", tone: "positive" },
    ],
  });

  const notes = planWidgetAnnotations("show incident response trend and velocity", data);

  assertNoteCount(notes, 1, 3);
  assert.equal(
    notes.some((note) => note.title === "Focus" || note.title === "Source"),
    false,
  );
  assert.ok(notes.some((note) => /mttr|p0\/p1/i.test(`${note.title} ${note.body}`)));
});

test("insights-heavy widget extracts risk and action from warning insights", () => {
  const data = widgetData({
    recommendedVisualization: "insights",
    subtitle: "Deal review summary",
    insights: [
      {
        label: "Silent champions",
        detail: "Three demos went silent after pricing — recommend a follow-up with ROI proof.",
        tone: "warning",
      },
      {
        label: "Security queue",
        detail: "Five expansion deals are blocked on security review.",
        tone: "negative",
      },
    ],
  });

  const notes = planWidgetAnnotations("summarize sales stuck deals with blockers and recommended actions", data);

  assertNoteCount(notes, 1, 4);
  assert.ok(notes.some((note) => note.color === "amber"), "should include a risk note");
  assert.ok(
    notes.some((note) => /follow-up|security review|blocked/i.test(note.body)),
    "should preserve actionable insight detail",
  );
});

test("funnel widget highlights worst drop-off as risk", () => {
  const data = widgetData({
    recommendedVisualization: "funnel",
    subtitle: "Signup to paid conversion",
    funnel: {
      title: "Activation funnel",
      steps: [
        { label: "Signup", value: 1200, dropoff: "", tone: "neutral" },
        { label: "First board", value: 780, dropoff: "-35%", tone: "warning" },
        { label: "Team invite", value: 410, dropoff: "-47%", tone: "negative" },
        { label: "Paid", value: 96, dropoff: "-77%", tone: "negative" },
      ],
    },
  });

  const notes = planWidgetAnnotations("show founder PLG activation funnel from signup to paid conversion", data);

  assertNoteCount(notes, 1, 4);
  assert.ok(
    notes.some((note) => /team invite|drop|leak|conversion/i.test(`${note.title} ${note.body}`)),
    "should call out funnel leak or conversion",
  );
});

test("supplements merge without duplicating auto-extracted notes", () => {
  const data = widgetData({
    recommendedVisualization: "table",
    subtitle: "PR review queue",
    table: {
      title: "Review queue",
      columns: ["Repo", "Waiting PRs", "Owner"],
      rows: [{ cells: ["web-app", "12", "Maya"] }],
    },
  });

  const notes = planWidgetAnnotations(
    "show engineering PR review bottlenecks",
    data,
    [{ role: "action", title: "Unblock Maya", body: "Pair Eli on infra reviews before Friday deploy window." }],
  );

  assertNoteCount(notes, 1, 4);
  assert.ok(notes.some((note) => /unblock maya|pair eli/i.test(`${note.title} ${note.body}`)));
  const bodies = notes.map((note) => note.body.toLowerCase());
  assert.equal(new Set(bodies).size, bodies.length, "supplements should not duplicate extracted notes");
});

test("time series widget adds trend note and remaps conflicting placements", () => {
  const data = widgetData({
    recommendedVisualization: "line_chart",
    subtitle: "Past 6 sprints · shipped PRs",
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
        detail: "S6 merged 86 PRs while escaped bugs fell to 4.",
        tone: "positive",
      },
    ],
  });

  const notes = planWidgetAnnotations("show engineering velocity across recent sprints", data);

  assertNoteCount(notes, 1, 4);
  assertUniquePlacements(notes);
  assert.ok(notes.some((note) => /merged prs|up \d+%|s1|s6/i.test(note.body)));
});

test("sparse widget can return zero notes", () => {
  const data = widgetData({
    recommendedVisualization: "metrics",
    subtitle: "No material changes this week",
    metrics: [{ label: "Open items", value: "0", delta: "", tone: "neutral" }],
  });

  const notes = planWidgetAnnotations("show weekly status", data);

  assertNoteCount(notes, 0, 0);
});

test("planWidgetAnnotations never returns more than four notes", () => {
  const data = widgetData({
    recommendedVisualization: "composite",
    subtitle: "Busy operating snapshot",
    metrics: [
      { label: "Runway", value: "14.8 mo", delta: "+0.6 mo", tone: "positive" },
      { label: "Burn", value: "$182k", delta: "-7% MoM", tone: "positive" },
    ],
    insights: [
      { label: "Renewal risk", detail: "Mercury Ops renews in July with high risk.", tone: "warning" },
      { label: "Next raise", detail: "Refresh the raise timeline before partner calls.", tone: "neutral" },
    ],
    table: {
      title: "Priorities",
      columns: ["Priority", "Status", "Blocker", "Due"],
      rows: [
        { cells: ["SOC 2 packet", "Blocked", "Evidence owner missing", "Jun 30"] },
        { cells: ["Mercury renewal", "At risk", "Champion unresponsive", "Jul 12"] },
      ],
    },
    funnel: {
      title: "Activation",
      steps: [
        { label: "Signup", value: 900, dropoff: "", tone: "neutral" },
        { label: "Invite", value: 420, dropoff: "-53%", tone: "negative" },
        { label: "Paid", value: 80, dropoff: "-81%", tone: "negative" },
      ],
    },
    ranking: {
      title: "Customer concentration",
      items: [
        { label: "Mercury Ops", value: "$420k ARR", detail: "Renews Jul 12", badge: "High", tone: "negative" },
        { label: "Vector Bank", value: "$280k ARR", detail: "Security blocked", badge: "Watch", tone: "warning" },
      ],
    },
    milestones: {
      title: "Fundraise readiness",
      items: [
        { label: "SOC 2 evidence", detail: "Blocked on owner assignment", status: "blocked" },
        { label: "Data room cleanup", detail: "Due Jul 1", status: "todo" },
      ],
    },
    timeSeries: {
      title: "Burn trend",
      projectionStartIndex: -1,
      series: [{ label: "Net burn", tone: "positive" }],
      points: [
        { label: "Jan", values: [210] },
        { label: "Jun", values: [182] },
      ],
    },
  });

  const notes = planWidgetAnnotations(
    "show founder runway, renewal risk, blockers, and activation trend",
    data,
    [{ role: "action", title: "Escalate", body: "Schedule executive check-in for Mercury Ops this week." }],
  );

  assertNoteCount(notes, 1, 4);
  assertUniquePlacements(notes);
  assert.ok(noteRoles(notes).length === notes.length);
});
