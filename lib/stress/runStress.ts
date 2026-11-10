// Spec 10.4 — Stress test runner (pure: runs in the browser on /admin/stresstest and in Vitest).
import { generate, TIER_LIMIT } from "../engine/generate";
import type { Catalog, Game, NeedsProfile } from "../engine/types";
import { validate } from "../engine/validate";

/** Deterministic PRNG (mulberry32) – no dependency, same profiles everywhere. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const USES = ["GAMING", "STUDY", "STREAMING", "VIDEO_EDIT", "PROGRAMMING", "3D"] as const;

export function randomProfiles(count: number, games: readonly Game[], seed = 219): NeedsProfile[] {
  const r = mulberry32(seed);
  const pick = <T>(a: readonly T[]) => a[Math.floor(r() * a.length)];
  const some = <T>(a: readonly T[], max: number) => a.filter(() => r() < max / a.length);
  return Array.from({ length: count }, () => {
    const uses = some(USES, 2);
    return {
      budgetNok: 4000 + Math.round((r() * 46000) / 500) * 500,
      includeOs: r() < 0.8,
      uses: uses.length ? uses : ["GAMING"],
      games: some(games.map((g) => g.slug), 2),
      resolution: pick(["1080p", "1080p", "1440p", "2160p"] as const),
      targetHz: pick([60, 144, 144, 240] as const),
      preferences: { quiet: r() < 0.2, small: r() < 0.15, wifi: r() < 0.4, rgb: r() < 0.15, whiteBuild: r() < 0.1 },
      longevityYears: r() < 0.5 ? 3 : 5,
      assemblyService: r() < 0.3,
    };
  });
}

export interface StressSample {
  budgetNok: number;
  ms: number;
  ok: boolean;
  budgetTooLow: boolean;
  valid: boolean;
  /** Recommended total / budget (0 when no package). */
  utilisation: number;
  error?: string;
}

/** Runs one profile and independently re-validates every returned package. */
export function runOne(needs: NeedsProfile, catalog: Catalog, games: readonly Game[]): StressSample {
  const t0 = performance.now();
  const res = generate(needs, catalog, games);
  const ms = performance.now() - t0;
  if (!res.ok) {
    const valid = res.minimumNok > needs.budgetNok;
    return { budgetNok: needs.budgetNok, ms, ok: false, budgetTooLow: true, valid, utilisation: 0, error: valid ? undefined : res.message };
  }
  const options = { includeOs: needs.includeOs, wantsWifi: !!needs.preferences.wifi, gaming: needs.uses.includes("GAMING") };
  let error: string | undefined;
  for (const p of res.packages) {
    const v = validate(p.items, catalog, options);
    if (!v.ok) error = `${p.tier}: ${v.results.filter((x) => !x.passed && x.severity === "ERROR").map((x) => x.ruleId).join(", ") || "sjekkliste"}`;
    else if (p.totalNok > needs.budgetNok * TIER_LIMIT[p.tier]) error = `${p.tier}: over grensen`;
  }
  const rec = res.packages.find((p) => p.tier === "RECOMMENDED");
  return { budgetNok: needs.budgetNok, ms, ok: true, budgetTooLow: false, valid: !error, utilisation: rec ? rec.totalNok / needs.budgetNok : 0, error };
}

export interface StressSummary {
  runs: number;
  validPct: number;
  budgetTooLow: number;
  p50: number;
  p95: number;
  max: number;
  histogram: { bucket: string; count: number }[];
  failures: { budgetNok: number; error: string }[];
}

export function summarise(samples: StressSample[]): StressSummary {
  const times = samples.map((s) => s.ms).sort((a, b) => a - b);
  const q = (p: number) => (times.length ? times[Math.min(times.length - 1, Math.floor(p * times.length))] : 0);
  const buckets = ["< 70 %", "70–80 %", "80–90 %", "90–95 %", "95–100 %"];
  const bucketOf = (u: number) => (u < 0.7 ? 0 : u < 0.8 ? 1 : u < 0.9 ? 2 : u < 0.95 ? 3 : 4);
  const histogram = buckets.map((bucket) => ({ bucket, count: 0 }));
  for (const s of samples) if (s.ok) histogram[bucketOf(s.utilisation)].count++;
  return {
    runs: samples.length,
    validPct: samples.length ? (100 * samples.filter((s) => s.valid).length) / samples.length : 0,
    budgetTooLow: samples.filter((s) => s.budgetTooLow).length,
    p50: q(0.5),
    p95: q(0.95),
    max: times[times.length - 1] ?? 0,
    histogram,
    failures: samples.filter((s) => !s.valid).map((s) => ({ budgetNok: s.budgetNok, error: s.error ?? "ukjent" })),
  };
}
