// H1–H3 — metrics from a small, hand-made event log.
import { describe, expect, it } from "vitest";
import { computeMetrics, median, sessionSummaries, type EventRow, type SessionRow } from "@/lib/analytics/metrics";

const t0 = new Date("2026-11-10T10:00:00Z").getTime();
const ev = (type: string, sec: number, actor: { s?: string; a?: string }, payload: object = {}): EventRow => ({
  type,
  anonymousId: actor.a ?? "anon-x",
  sessionId: actor.s ?? null,
  payload,
  ts: new Date(t0 + sec * 1000),
});

// S1: full happy path with green check (60 s to package), confidence 5
// S2: sees red errors, never green, abandons
// anon: only views the wizard
const events: EventRow[] = [
  ev("wizard_step_viewed", 0, { s: "s1" }),
  ev("wizard_step_completed", 10, { s: "s1" }, { step: "budget", ms: 10_000 }),
  ev("wizard_step_completed", 30, { s: "s1" }, { step: "use", ms: 20_000 }),
  ev("package_viewed", 60, { s: "s1" }),
  ev("cart_viewed", 90, { s: "s1" }, { complete: true }),
  ev("cart_green_check_shown", 91, { s: "s1" }),
  ev("checkout_started", 100, { s: "s1" }, { complete: true }),
  ev("checkout_completed", 130, { s: "s1" }),
  ev("wizard_step_viewed", 0, { s: "s2" }),
  ev("wizard_step_completed", 30, { s: "s2" }, { step: "budget", ms: 30_000 }),
  ev("package_viewed", 120, { s: "s2" }),
  ev("part_swapped", 125, { s: "s2" }),
  ev("cart_viewed", 150, { s: "s2" }, { complete: false }),
  ev("validation_error_shown", 151, { s: "s2" }, { rules: ["R03_GPU_LENGTH"] }),
  ev("checklist_fix_clicked", 160, { s: "s2" }),
  ev("cart_abandoned", 200, { s: "s2" }),
  ev("wizard_step_viewed", 0, { a: "anon-1" }),
];
const sessions: SessionRow[] = [
  { id: "s1", participantCode: "RESP-08", segment: "Førstegangskjøper", startedAt: new Date(t0), finishedAt: new Date(t0 + 140_000), completed: true, confidenceScore: 5, notes: "Rask" },
  { id: "s2", participantCode: "RESP-09", segment: "Førstegangskjøper", startedAt: new Date(t0), finishedAt: new Date(t0 + 220_000), completed: false, confidenceScore: 2, notes: null },
  { id: "s3", participantCode: "RESP-10", segment: "Foresatt", startedAt: new Date(t0), finishedAt: null, completed: false, confidenceScore: null, notes: null },
];

describe("computeMetrics", () => {
  const m = computeMetrics(events, sessions);

  it("counts the funnel per actor (session or anonymous visitor)", () => {
    expect(m.actors).toBe(3);
    expect(m.funnel.map((f) => f.count)).toEqual([3, 2, 2, 1, 1]);
  });

  it("H1: median time from wizard start to package, and per-step times", () => {
    expect(m.h1.medianTimeToPackageSec).toBe(90); // median(60, 120)
    expect(m.h1.n).toBe(2);
    expect(m.h1.steps).toEqual([
      { step: "budget", medianSec: 20, n: 2 },
      { step: "use", medianSec: 20, n: 1 },
    ]);
  });

  it("H2: completion with vs. without the green check", () => {
    expect(m.h2).toEqual({ green: { n: 1, completed: 1 }, notGreen: { n: 1, completed: 0 } });
  });

  it("H3: complete package at last cart view + checklist fixes", () => {
    expect(m.h3).toEqual({ withCart: 2, completeAtLastView: 1, checklistFixes: 1, actorsUsingFixes: 1 });
  });

  it("hesitation counters and top error rules", () => {
    expect(m.hesitation).toMatchObject({ validationErrors: 1, swaps: 1, topErrorRules: [{ rule: "R03_GPU_LENGTH", count: 1 }] });
  });

  it("segments only include finished sessions", () => {
    expect(m.segments).toEqual([{ segment: "Førstegangskjøper", n: 2, completed: 1, medianDurationSec: 180, avgConfidence: 3.5 }]);
  });
});

describe("sessionSummaries", () => {
  it("summarises each session from its own events", () => {
    const [s3, s2, s1] = sessionSummaries(sessions, events).sort((a, b) => b.participantCode.localeCompare(a.participantCode));
    expect(s1).toMatchObject({ participantCode: "RESP-08", durationSec: 140, completed: true, confidence: 5, timeToPackageSec: 60, sawGreenCheck: true, validationErrors: 0 });
    expect(s2).toMatchObject({ sawGreenCheck: false, validationErrors: 1, swaps: 1, notes: "" });
    expect(s3.durationSec).toBeNull();
  });
});

it("median", () => {
  expect(median([])).toBeNull();
  expect(median([3, 1, 2])).toBe(2);
  expect(median([4, 1, 2, 3])).toBe(2.5);
});
