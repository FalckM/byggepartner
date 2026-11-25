// H1–H3, US-16 — Metrics computed from raw events + test sessions (pure, unit-tested).
export interface EventRow {
  type: string;
  anonymousId: string;
  sessionId: string | null;
  payload: unknown;
  ts: Date;
}
export interface SessionRow {
  id: string;
  participantCode: string;
  segment: string;
  taskDescription?: string;
  startedAt: Date;
  finishedAt: Date | null;
  completed: boolean;
  confidenceScore: number | null;
  notes: string | null;
}

export const FUNNEL = [
  { key: "wizard_step_viewed", label: "Startet veiviseren" },
  { key: "package_viewed", label: "Så PC-forslag" },
  { key: "cart_viewed", label: "Åpnet handlekurven" },
  { key: "checkout_started", label: "Gikk til kassen" },
  { key: "checkout_completed", label: "Fullførte bestilling" },
] as const;

/** One "actor" = a test session if present, otherwise the anonymous visitor. */
const actorOf = (e: EventRow) => e.sessionId ?? `anon:${e.anonymousId}`;
const payloadOf = (e: EventRow) => (e.payload && typeof e.payload === "object" ? (e.payload as Record<string, unknown>) : {});

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function byActor(events: EventRow[]): Map<string, EventRow[]> {
  const m = new Map<string, EventRow[]>();
  for (const e of [...events].sort((a, b) => a.ts.getTime() - b.ts.getTime())) {
    const k = actorOf(e);
    (m.get(k) ?? m.set(k, []).get(k)!).push(e);
  }
  return m;
}

function timeToPackageMs(list: EventRow[]): number | null {
  const start = list.find((e) => e.type === "wizard_step_viewed");
  const pkg = start && list.find((e) => e.type === "package_viewed" && e.ts >= start.ts);
  return start && pkg ? pkg.ts.getTime() - start.ts.getTime() : null;
}

export interface Metrics {
  actors: number;
  funnel: { key: string; label: string; count: number }[];
  h1: { medianTimeToPackageSec: number | null; n: number; steps: { step: string; medianSec: number; n: number }[] };
  h2: { green: { n: number; completed: number }; notGreen: { n: number; completed: number } };
  h3: { withCart: number; completeAtLastView: number; checklistFixes: number; actorsUsingFixes: number };
  hesitation: { validationErrors: number; swapsOpened: number; swaps: number; explanations: number; askBuilder: number; topErrorRules: { rule: string; count: number }[] };
  segments: { segment: string; n: number; completed: number; medianDurationSec: number | null; avgConfidence: number | null }[];
}

export function computeMetrics(events: EventRow[], sessions: SessionRow[]): Metrics {
  const actors = byActor(events);
  const has = (list: EventRow[], type: string) => list.some((e) => e.type === type);

  const funnel = FUNNEL.map((f) => ({ ...f, count: [...actors.values()].filter((l) => has(l, f.key)).length }));

  const ttp = [...actors.values()].map(timeToPackageMs).filter((x): x is number => x !== null);
  const stepTimes = new Map<string, number[]>();
  for (const e of events) {
    if (e.type !== "wizard_step_completed") continue;
    const p = payloadOf(e);
    if (typeof p.step === "string" && typeof p.ms === "number") (stepTimes.get(p.step) ?? stepTimes.set(p.step, []).get(p.step)!).push(p.ms);
  }
  const STEP_ORDER = ["budget", "use", "games", "screen", "wishes"];
  const steps = [...stepTimes.entries()]
    .map(([step, ms]) => ({ step, medianSec: Math.round((median(ms) ?? 0) / 100) / 10, n: ms.length }))
    .sort((a, b) => STEP_ORDER.indexOf(a.step) - STEP_ORDER.indexOf(b.step));

  const withCart = [...actors.values()].filter((l) => has(l, "cart_viewed"));
  const green = withCart.filter((l) => has(l, "cart_green_check_shown"));
  const notGreen = withCart.filter((l) => !has(l, "cart_green_check_shown"));
  const completed = (ls: EventRow[][]) => ls.filter((l) => has(l, "checkout_completed")).length;

  const lastCartComplete = withCart.filter((l) => {
    const last = [...l].reverse().find((e) => e.type === "cart_viewed" || e.type === "checkout_started" || e.type === "cart_green_check_shown");
    return last ? payloadOf(last).complete === true || last.type === "cart_green_check_shown" : false;
  }).length;

  const count = (type: string) => events.filter((e) => e.type === type).length;
  const ruleCounts = new Map<string, number>();
  for (const e of events) {
    if (e.type !== "validation_error_shown") continue;
    const rules = payloadOf(e).rules;
    if (Array.isArray(rules)) for (const r of rules) ruleCounts.set(String(r), (ruleCounts.get(String(r)) ?? 0) + 1);
  }

  const finished = sessions.filter((s) => s.finishedAt);
  const segNames = [...new Set(finished.map((s) => s.segment))].sort();
  const segments = segNames.map((segment) => {
    const ss = finished.filter((s) => s.segment === segment);
    const conf = ss.map((s) => s.confidenceScore).filter((x): x is number => x !== null);
    return {
      segment,
      n: ss.length,
      completed: ss.filter((s) => s.completed).length,
      medianDurationSec: median(ss.map((s) => (s.finishedAt!.getTime() - s.startedAt.getTime()) / 1000)),
      avgConfidence: conf.length ? Math.round((conf.reduce((a, b) => a + b, 0) / conf.length) * 10) / 10 : null,
    };
  });

  return {
    actors: actors.size,
    funnel,
    h1: { medianTimeToPackageSec: ttp.length ? Math.round(median(ttp)! / 1000) : null, n: ttp.length, steps },
    h2: { green: { n: green.length, completed: completed(green) }, notGreen: { n: notGreen.length, completed: completed(notGreen) } },
    h3: {
      withCart: withCart.length,
      completeAtLastView: lastCartComplete,
      checklistFixes: count("checklist_fix_clicked"),
      actorsUsingFixes: [...actors.values()].filter((l) => has(l, "checklist_fix_clicked")).length,
    },
    hesitation: {
      validationErrors: count("validation_error_shown"),
      swapsOpened: count("part_swap_opened"),
      swaps: count("part_swapped"),
      explanations: count("explanation_opened"),
      askBuilder: count("ask_builder_opened"),
      topErrorRules: [...ruleCounts.entries()].map(([rule, c]) => ({ rule, count: c })).sort((a, b) => b.count - a.count).slice(0, 5),
    },
    segments,
  };
}

export interface SessionSummary {
  participantCode: string;
  segment: string;
  startedAt: string;
  durationSec: number | null;
  completed: boolean;
  confidence: number | null;
  timeToPackageSec: number | null;
  sawGreenCheck: boolean;
  validationErrors: number;
  swaps: number;
  notes: string;
}

export function sessionSummaries(sessions: SessionRow[], events: EventRow[]): SessionSummary[] {
  return [...sessions]
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
    .map((s) => {
      const list = events.filter((e) => e.sessionId === s.id).sort((a, b) => a.ts.getTime() - b.ts.getTime());
      const ttp = timeToPackageMs(list);
      return {
        participantCode: s.participantCode,
        segment: s.segment,
        startedAt: s.startedAt.toISOString(),
        durationSec: s.finishedAt ? Math.round((s.finishedAt.getTime() - s.startedAt.getTime()) / 1000) : null,
        completed: s.completed,
        confidence: s.confidenceScore,
        timeToPackageSec: ttp === null ? null : Math.round(ttp / 1000),
        sawGreenCheck: list.some((e) => e.type === "cart_green_check_shown"),
        validationErrors: list.filter((e) => e.type === "validation_error_shown").length,
        swaps: list.filter((e) => e.type === "part_swapped").length,
        notes: s.notes ?? "",
      };
    });
}
