// Spec 10.4 / phase 3 gate — 500 random needs profiles on the 2 000-component synthetic catalog:
// 100 % valid packages and generator p95 < 300 ms.
import { describe, expect, it } from "vitest";
import { loadSeedGames } from "@/lib/data/seedData";
import { ComponentSchema } from "@/lib/engine/types";
import { randomProfiles, runOne, summarise } from "@/lib/stress/runStress";
import { generateStressCatalog, STRESS_COUNTS } from "@/lib/stress/stressCatalog";

const games = loadSeedGames();
const catalog = generateStressCatalog();

describe("stress catalog", () => {
  it("has ~2 000 schema-valid components and is deterministic", () => {
    const synthetic = catalog.filter((c) => c.source === "import:stress");
    expect(synthetic.length).toBe(Object.values(STRESS_COUNTS).reduce((a, b) => a + b, 0));
    expect(catalog.length).toBeGreaterThanOrEqual(2000);
    for (const c of catalog) ComponentSchema.parse(c);
    expect(JSON.stringify(generateStressCatalog().slice(0, 50))).toBe(JSON.stringify(catalog.slice(0, 50)));
  });
});

describe("stress test (500 profiles)", () => {
  it("returns 100 % valid packages with p95 < 300 ms", () => {
    const summary = summarise(randomProfiles(500, games).map((n) => runOne(n, catalog, games)));
    console.info(
      `stress: ${summary.validPct}% valid, BUDGET_TOO_LOW ${summary.budgetTooLow}, p50 ${summary.p50.toFixed(1)} ms, p95 ${summary.p95.toFixed(1)} ms`,
    );
    expect(summary.failures).toEqual([]);
    expect(summary.validPct).toBe(100);
    expect(summary.p95).toBeLessThan(300);
  }, 300_000);
});
