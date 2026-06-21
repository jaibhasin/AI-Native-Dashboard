import type { CanvasNote, ExampleWidgetData } from "./dashboard-schemas";

export type PlannedWidgetNoteSpec = {
  body: string;
  color: CanvasNote["color"];
  placement: "top" | "left" | "right" | "bottom";
  title: string;
};

export type WidgetAnnotationRole = "headline" | "context" | "trend" | "risk" | "deadline" | "action";

export type WidgetAnnotationCandidate = {
  body: string;
  role: WidgetAnnotationRole;
  score: number;
  title: string;
};

export type WidgetAnnotationSupplement = {
  body: string;
  role: WidgetAnnotationRole;
  score?: number;
  title: string;
};

const ROLE_DEFAULT_PLACEMENT: Record<WidgetAnnotationRole, PlannedWidgetNoteSpec["placement"]> = {
  action: "bottom",
  context: "left",
  deadline: "bottom",
  headline: "top",
  risk: "right",
  trend: "right",
};

const ROLE_COLOR: Record<WidgetAnnotationRole, CanvasNote["color"]> = {
  action: "rose",
  context: "green",
  deadline: "rose",
  headline: "blue",
  risk: "amber",
  trend: "amber",
};

const ROLE_PRIORITY: Record<WidgetAnnotationRole, number> = {
  action: 70,
  context: 40,
  deadline: 75,
  headline: 90,
  risk: 80,
  trend: 65,
};

const ALL_PLACEMENTS: PlannedWidgetNoteSpec["placement"][] = ["top", "left", "right", "bottom"];

const GENERIC_NOTE_PATTERNS = [
  /^use ai-generated/i,
  /^values are ai-generated/i,
  /^preview data only/i,
  /^source:/i,
  /^focus$/i,
  /^watch$/i,
  /^next$/i,
];

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function compactKey(value: string) {
  return normalizeText(value).toLowerCase().replace(/[^\w\s]/g, "");
}

function overlapsSubtitle(body: string, subtitle: string) {
  const bodyKey = compactKey(body);
  const subtitleKey = compactKey(subtitle);

  if (!bodyKey || !subtitleKey) {
    return false;
  }

  return bodyKey === subtitleKey || bodyKey.includes(subtitleKey) || subtitleKey.includes(bodyKey);
}

function isGenericNote(title: string, body: string) {
  const combined = `${title} ${body}`.trim();

  if (combined.length < 12) {
    return true;
  }

  return GENERIC_NOTE_PATTERNS.some((pattern) => pattern.test(title.trim()) || pattern.test(body.trim()));
}

function promptBoost(prompt: string, role: WidgetAnnotationRole) {
  const lowerPrompt = prompt.toLowerCase();
  let boost = 0;

  if (/\b(blocker|bottleneck|stuck|risk|at risk)\b/.test(lowerPrompt) && (role === "risk" || role === "action")) {
    boost += 12;
  }

  if (/\b(trend|forecast|velocity|over time|trajectory)\b/.test(lowerPrompt) && (role === "trend" || role === "headline")) {
    boost += 12;
  }

  if (/\b(renewal|deadline|due|milestone)\b/.test(lowerPrompt) && role === "deadline") {
    boost += 12;
  }

  if (/\b(status table|projects|workstream|owner|task)\b/.test(lowerPrompt) && (role === "action" || role === "risk")) {
    boost += 8;
  }

  if (/\b(source|context|data)\b/.test(lowerPrompt) && role === "context") {
    boost += 10;
  }

  return boost;
}

function addCandidate(
  candidates: WidgetAnnotationCandidate[],
  candidate: Omit<WidgetAnnotationCandidate, "score"> & { score?: number },
) {
  const body = normalizeText(candidate.body);
  const title = normalizeText(candidate.title);

  if (!body || isGenericNote(title, body)) {
    return;
  }

  candidates.push({
    ...candidate,
    body,
    title: title || "Note",
    score: (candidate.score ?? ROLE_PRIORITY[candidate.role]) + promptBoost("", candidate.role),
  });
}

function extractMetricCandidates(data: ExampleWidgetData, prompt: string) {
  const candidates: WidgetAnnotationCandidate[] = [];

  for (const metric of data.metrics) {
    if (metric.delta && metric.tone !== "neutral") {
      addCandidate(candidates, {
        body: `${metric.label}: ${metric.value} (${metric.delta}).`,
        role: "headline",
        title: metric.label,
        score: ROLE_PRIORITY.headline + (metric.tone === "positive" ? 6 : 10) + promptBoost(prompt, "headline"),
      });
    }
  }

  return candidates;
}

function extractInsightCandidates(data: ExampleWidgetData, prompt: string) {
  const candidates: WidgetAnnotationCandidate[] = [];

  for (const insight of data.insights) {
    if (overlapsSubtitle(insight.detail, data.subtitle)) {
      continue;
    }

    if (insight.tone === "warning" || insight.tone === "negative") {
      addCandidate(candidates, {
        body: insight.detail,
        role: "risk",
        title: insight.label,
        score: ROLE_PRIORITY.risk + 8 + promptBoost(prompt, "risk"),
      });
      continue;
    }

    if (/\b(recommend|next|should|follow-up|assign|route|close|review)\b/i.test(insight.detail)) {
      addCandidate(candidates, {
        body: insight.detail,
        role: "action",
        title: insight.label,
        score: ROLE_PRIORITY.action + 6 + promptBoost(prompt, "action"),
      });
      continue;
    }

    addCandidate(candidates, {
      body: insight.detail,
      role: "headline",
      title: insight.label,
      score: ROLE_PRIORITY.headline + 4 + promptBoost(prompt, "headline"),
    });
  }

  return candidates;
}

function findColumnIndex(columns: string[], patterns: RegExp[]) {
  return columns.findIndex((column) => patterns.some((pattern) => pattern.test(column)));
}

function extractTableCandidates(data: ExampleWidgetData, prompt: string) {
  const candidates: WidgetAnnotationCandidate[] = [];
  const { table } = data;

  if (table.columns.length === 0 || table.rows.length === 0) {
    return candidates;
  }

  const labelIndex = 0;
  const blockerIndex = findColumnIndex(table.columns, [/blocker/i, /next step/i, /needed/i, /gap/i]);
  const riskIndex = findColumnIndex(table.columns, [/risk/i, /status/i]);
  const dueIndex = findColumnIndex(table.columns, [/due/i, /renewal/i, /deadline/i, /age/i]);
  const ownerIndex = findColumnIndex(table.columns, [/owner/i, /reviewer/i]);

  for (const row of table.rows.slice(0, 4)) {
    const label = row.cells[labelIndex] ?? "Item";
    const blocker = blockerIndex >= 0 ? row.cells[blockerIndex] : "";
    const risk = riskIndex >= 0 ? row.cells[riskIndex] : "";
    const due = dueIndex >= 0 ? row.cells[dueIndex] : "";
    const owner = ownerIndex >= 0 ? row.cells[ownerIndex] : "";

    if (blocker && !/^none$/i.test(blocker)) {
      addCandidate(candidates, {
        body: `${label}: ${blocker}.`,
        role: /\b(review|next|assign|route|close)\b/i.test(blocker) ? "action" : "risk",
        title: label,
        score: ROLE_PRIORITY.risk + 10 + promptBoost(prompt, "risk"),
      });
    }

    if (risk && /\b(high|blocked|at risk|watch|overdue|fail)\b/i.test(risk)) {
      addCandidate(candidates, {
        body: `${label} is ${risk.toLowerCase()}${owner ? ` — owner ${owner}` : ""}.`,
        role: "risk",
        title: label,
        score: ROLE_PRIORITY.risk + 12 + promptBoost(prompt, "risk"),
      });
    }

    if (due && due.trim()) {
      addCandidate(candidates, {
        body: `${label} due ${due}${owner ? ` · ${owner}` : ""}.`,
        role: "deadline",
        title: label,
        score: ROLE_PRIORITY.deadline + 8 + promptBoost(prompt, "deadline"),
      });
    }
  }

  return candidates;
}

function extractFunnelCandidates(data: ExampleWidgetData, prompt: string) {
  const candidates: WidgetAnnotationCandidate[] = [];
  const steps = data.funnel.steps;

  if (steps.length === 0) {
    return candidates;
  }

  const worstDropoff = [...steps]
    .slice(1)
    .sort((left, right) => {
      const leftValue = Number.parseInt(left.dropoff.replace(/[^\d-]/g, ""), 10) || 0;
      const rightValue = Number.parseInt(right.dropoff.replace(/[^\d-]/g, ""), 10) || 0;

      return leftValue - rightValue;
    })[0];

  if (worstDropoff) {
    addCandidate(candidates, {
      body: `${worstDropoff.label} drops ${worstDropoff.dropoff || "sharply"} — biggest leak in the funnel.`,
      role: "risk",
      title: "Drop-off",
      score: ROLE_PRIORITY.risk + 14 + promptBoost(prompt, "risk"),
    });
  }

  const lastStep = steps[steps.length - 1];
  const firstStep = steps[0];

  if (firstStep.value > 0) {
    const conversion = Math.round((lastStep.value / firstStep.value) * 100);

    addCandidate(candidates, {
      body: `${lastStep.label} conversion is ${conversion}% from ${firstStep.label}.`,
      role: "headline",
      title: "Conversion",
      score: ROLE_PRIORITY.headline + 6 + promptBoost(prompt, "headline"),
    });
  }

  return candidates;
}

function extractRankingCandidates(data: ExampleWidgetData, prompt: string) {
  const candidates: WidgetAnnotationCandidate[] = [];
  const items = data.ranking.items;

  if (items.length === 0) {
    return candidates;
  }

  const topItem = items[0];
  addCandidate(candidates, {
    body: `${topItem.label} leads at ${topItem.value}${topItem.detail ? ` · ${topItem.detail}` : ""}.`,
    role: "headline",
    title: topItem.label,
    score: ROLE_PRIORITY.headline + 5 + promptBoost(prompt, "headline"),
  });

  const riskyItem = items.find((item) => item.tone === "negative" || /high/i.test(item.badge));

  if (riskyItem) {
    addCandidate(candidates, {
      body: `${riskyItem.label} flagged ${riskyItem.badge.toLowerCase()} risk${riskyItem.detail ? ` (${riskyItem.detail})` : ""}.`,
      role: "risk",
      title: riskyItem.label,
      score: ROLE_PRIORITY.risk + 12 + promptBoost(prompt, "risk"),
    });
  }

  return candidates;
}

function extractMilestoneCandidates(data: ExampleWidgetData, prompt: string) {
  const candidates: WidgetAnnotationCandidate[] = [];

  for (const item of data.milestones.items) {
    if (item.status === "blocked") {
      addCandidate(candidates, {
        body: item.detail || `${item.label} is blocked.`,
        role: "risk",
        title: item.label,
        score: ROLE_PRIORITY.risk + 14 + promptBoost(prompt, "risk"),
      });
      continue;
    }

    if (item.status === "todo" || item.status === "active") {
      const hasDate = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4}|\d{1,2}\/\d{1,2}|\d{1,2}d)\b/i.test(
        item.detail,
      );

      addCandidate(candidates, {
        body: item.detail || `${item.label} needs attention.`,
        role: hasDate ? "deadline" : item.status === "active" ? "action" : "risk",
        title: item.label,
        score: (hasDate ? ROLE_PRIORITY.deadline : ROLE_PRIORITY.action) + 8 + promptBoost(prompt, hasDate ? "deadline" : "action"),
      });
    }
  }

  return candidates;
}

function extractTimeSeriesCandidates(data: ExampleWidgetData, prompt: string) {
  const candidates: WidgetAnnotationCandidate[] = [];
  const { timeSeries } = data;

  if (timeSeries.points.length < 2 || timeSeries.series.length === 0) {
    return candidates;
  }

  const firstPoint = timeSeries.points[0];
  const lastPoint = timeSeries.points[timeSeries.points.length - 1];
  const seriesLabel = timeSeries.series[0]?.label ?? "Value";
  const firstValue = firstPoint.values[0] ?? 0;
  const lastValue = lastPoint.values[0] ?? 0;

  if (firstValue !== lastValue) {
    const delta = lastValue - firstValue;
    const direction = delta > 0 ? "up" : "down";
    const magnitude = firstValue !== 0 ? Math.abs(Math.round((delta / firstValue) * 100)) : Math.abs(delta);

    addCandidate(candidates, {
      body: `${seriesLabel} is ${direction} ${magnitude}${firstValue !== 0 ? "%" : ""} from ${firstPoint.label} to ${lastPoint.label}.`,
      role: "trend",
      title: seriesLabel,
      score: ROLE_PRIORITY.trend + 10 + promptBoost(prompt, "trend"),
    });
  }

  const warningSeriesIndex = timeSeries.series.findIndex((series) => series.tone === "warning" || series.tone === "negative");

  if (warningSeriesIndex >= 0) {
    const warningLabel = timeSeries.series[warningSeriesIndex].label;
    const warningFirst = firstPoint.values[warningSeriesIndex] ?? firstPoint.values[0] ?? 0;
    const warningLast = lastPoint.values[warningSeriesIndex] ?? lastPoint.values[0] ?? 0;

    if (warningFirst !== warningLast) {
      addCandidate(candidates, {
        body: `${warningLabel} moved from ${warningFirst} to ${warningLast} across the same period.`,
        role: "trend",
        title: warningLabel,
        score: ROLE_PRIORITY.trend + 8 + promptBoost(prompt, "trend"),
      });
    }
  }

  return candidates;
}

function extractAllCandidates(prompt: string, data: ExampleWidgetData) {
  return [
    ...extractMetricCandidates(data, prompt),
    ...extractInsightCandidates(data, prompt),
    ...extractTableCandidates(data, prompt),
    ...extractFunnelCandidates(data, prompt),
    ...extractRankingCandidates(data, prompt),
    ...extractMilestoneCandidates(data, prompt),
    ...extractTimeSeriesCandidates(data, prompt),
  ].map((candidate) => ({
    ...candidate,
    score: candidate.score + promptBoost(prompt, candidate.role),
  }));
}

function dedupeCandidates(candidates: WidgetAnnotationCandidate[]) {
  const seen = new Set<string>();
  const deduped: WidgetAnnotationCandidate[] = [];

  for (const candidate of candidates.sort((left, right) => right.score - left.score)) {
    const key = `${candidate.role}:${compactKey(candidate.body).slice(0, 80)}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(candidate);
  }

  return deduped;
}

function selectCandidates(candidates: WidgetAnnotationCandidate[], prompt: string, data: ExampleWidgetData) {
  const filtered = dedupeCandidates(candidates).filter((candidate) => !overlapsSubtitle(candidate.body, data.subtitle));
  const selected: WidgetAnnotationCandidate[] = [];
  const usedRoles = new Set<WidgetAnnotationRole>();

  for (const candidate of filtered) {
    if (selected.length >= 4) {
      break;
    }

    if (candidate.role === "context" && !/\b(source|context|data)\b/i.test(prompt) && selected.length > 0) {
      continue;
    }

    if (usedRoles.has(candidate.role) && candidate.role !== "headline") {
      continue;
    }

    selected.push(candidate);
    usedRoles.add(candidate.role);
  }

  return selected.sort((left, right) => ROLE_PRIORITY[right.role] - ROLE_PRIORITY[left.role] || right.score - left.score);
}

function remapPlacements(selected: WidgetAnnotationCandidate[]) {
  const occupied = new Set<PlannedWidgetNoteSpec["placement"]>();
  const resolved: Array<WidgetAnnotationCandidate & { placement: PlannedWidgetNoteSpec["placement"] }> = [];

  for (const candidate of selected) {
    let placement = ROLE_DEFAULT_PLACEMENT[candidate.role];

    if (occupied.has(placement)) {
      const openPlacement = ALL_PLACEMENTS.find((side) => !occupied.has(side));

      if (!openPlacement) {
        continue;
      }

      placement = openPlacement;
    }

    occupied.add(placement);
    resolved.push({ ...candidate, placement });
  }

  return resolved;
}

function supplementsToCandidates(supplements: WidgetAnnotationSupplement[] | undefined, prompt: string) {
  if (!supplements?.length) {
    return [] as WidgetAnnotationCandidate[];
  }

  return supplements
    .map((supplement) => ({
      body: normalizeText(supplement.body),
      role: supplement.role,
      score: (supplement.score ?? ROLE_PRIORITY[supplement.role]) + 20 + promptBoost(prompt, supplement.role),
      title: normalizeText(supplement.title) || "Note",
    }))
    .filter((candidate) => candidate.body && !isGenericNote(candidate.title, candidate.body));
}

export function planWidgetAnnotations(
  prompt: string,
  exampleData: ExampleWidgetData,
  supplements?: WidgetAnnotationSupplement[],
): PlannedWidgetNoteSpec[] {
  const candidates = [
    ...extractAllCandidates(prompt, exampleData),
    ...supplementsToCandidates(supplements, prompt),
  ];

  const selected = remapPlacements(selectCandidates(candidates, prompt, exampleData));

  return selected.map((candidate) => ({
    body: candidate.body,
    color: ROLE_COLOR[candidate.role],
    placement: candidate.placement,
    title: candidate.title,
  }));
}
