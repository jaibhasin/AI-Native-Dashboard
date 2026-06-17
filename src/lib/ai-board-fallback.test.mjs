import assert from "node:assert/strict";
import test from "node:test";
import { fallbackAiBoardPlan } from "./ai-board-fallback.ts";

const brief = {
  audience: "CEO and leadership team",
  dataSources: "Stripe, Linear, GitHub, PostHog",
  metrics: "MRR, ARR, burn, runway, pipeline, activation, retention, token spend",
  notes: "Keep risks and decisions visible.",
  purpose: "Create an operating review board for a B2B AI startup leadership meeting",
  tasks: "Review revenue, runway, pipeline, product velocity, AI infrastructure cost, and risks",
};

test("fallbackAiBoardPlan returns a valid useful board plan", () => {
  const plan = fallbackAiBoardPlan(brief);

  assert.match(plan.boardName, /CEO and leadership team/i);
  assert.equal(plan.widgets.length, 6);
  assert.ok(plan.notes.length >= 2);

  for (const widget of plan.widgets) {
    assert.equal(typeof widget.x, "number");
    assert.equal(typeof widget.y, "number");
    assert.ok(widget.prompt.length >= 8);
    assert.ok(widget.prompt.length <= 360);
    assert.ok(widget.prompt.includes("AI-generated dummy preview data only"));
    assert.ok(widget.exampleData);
    assert.equal(widget.exampleData.dataDisclosure, "Values are AI-generated preview data.");
    assert.ok(widget.exampleData.metrics.length > 0);
    assert.ok(widget.width >= 360);
    assert.ok(widget.height >= 260);
  }

  for (let leftIndex = 0; leftIndex < plan.widgets.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < plan.widgets.length; rightIndex += 1) {
      const left = plan.widgets[leftIndex];
      const right = plan.widgets[rightIndex];
      const overlaps =
        left.x < right.x + right.width &&
        left.x + left.width > right.x &&
        left.y < right.y + right.height &&
        left.y + left.height > right.y;

      assert.equal(overlaps, false);
    }
  }
});
