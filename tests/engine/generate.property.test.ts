// Spec 8.2 step 7 + 13 — PROPERTY: for any valid NeedsProfile the generator returns either packages
// that are complete, pass every rule and stay within their tier limit, or BUDGET_TOO_LOW.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { loadSeedGames } from "@/lib/data/seedData";
import { generate, TIER_LIMIT } from "@/lib/engine/generate";
import { NeedsProfileSchema, UseSchema, type NeedsProfile } from "@/lib/engine/types";
import { validate } from "@/lib/engine/validate";
import { seed } from "./helpers";

const games = loadSeedGames();
const RUNS = Number(process.env.FC_RUNS ?? 1000);

export const needsArb: fc.Arbitrary<NeedsProfile> = fc.record({
  budgetNok: fc.integer({ min: 0, max: 50_000 }),
  includeOs: fc.boolean(),
  uses: fc.uniqueArray(fc.constantFrom(...UseSchema.options), { maxLength: 4 }),
  games: fc.uniqueArray(fc.constantFrom(...games.map((g) => g.slug)), { maxLength: 4 }),
  resolution: fc.constantFrom("1080p", "1440p", "2160p"),
  targetHz: fc.constantFrom(60, 144, 240),
  preferences: fc.record(
    { quiet: fc.boolean(), small: fc.boolean(), wifi: fc.boolean(), rgb: fc.boolean(), whiteBuild: fc.boolean() },
    { requiredKeys: [] },
  ),
  longevityYears: fc.constantFrom(3, 5),
  assemblyService: fc.boolean(),
});

describe("generator invariant (fast-check)", () => {
  it(`holds for ${RUNS} random needs profiles`, () => {
    fc.assert(
      fc.property(needsArb, (needs) => {
        NeedsProfileSchema.parse(needs);
        const res = generate(needs, seed, games);
        if (!res.ok) {
          expect(res.reason).toBe("BUDGET_TOO_LOW");
          expect(res.minimumNok).toBeGreaterThan(needs.budgetNok);
          return;
        }
        expect(res.packages.some((p) => p.tier === "RECOMMENDED")).toBe(true);
        const options = { includeOs: needs.includeOs, wantsWifi: !!needs.preferences.wifi, gaming: needs.uses.includes("GAMING") };
        for (const p of res.packages) {
          const report = validate(p.items, seed, options);
          expect(report.ok).toBe(true);
          expect(report.results.filter((r) => !r.passed && r.severity === "ERROR")).toEqual([]);
          expect(report.totalNok).toBe(p.totalNok);
          expect(p.totalNok).toBeLessThanOrEqual(Math.floor(needs.budgetNok * TIER_LIMIT[p.tier]));
        }
      }),
      { numRuns: RUNS, seed: 219 },
    );
  }, 300_000);
});
