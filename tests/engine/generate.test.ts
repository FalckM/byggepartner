// DP1, DP3, US-03, US-13, US-18 — generator behaviour + scenarios S01–S12.
import { describe, expect, it } from "vitest";
import { loadSeedGames, loadSeedScenarios } from "@/lib/data/seedData";
import { generate, selectProfile, TIER_LIMIT } from "@/lib/engine/generate";
import { runScenario } from "@/lib/engine/scenarioRunner";
import type { NeedsProfile } from "@/lib/engine/types";
import { validate } from "@/lib/engine/validate";
import { seed } from "./helpers";

const games = loadSeedGames();
const scenarios = loadSeedScenarios();
const needs = (over: Partial<NeedsProfile> = {}): NeedsProfile => ({
  budgetNok: 14000,
  includeOs: true,
  uses: ["GAMING", "STUDY"],
  games: ["cs2", "fortnite"],
  resolution: "1080p",
  targetHz: 144,
  preferences: {},
  longevityYears: 5,
  assemblyService: false,
  ...over,
});

describe("scenarios S01–S12", () => {
  it.each(scenarios.map((s) => [s.id, s.description] as const))("%s – %s", (id) => {
    const run = runScenario(scenarios.find((s) => s.id === id)!, seed, games);
    expect(run.checks.filter((c) => !c.passed), JSON.stringify(run.checks)).toEqual([]);
    expect(run.status).toBe("PASS");
  });
});

describe("generate", () => {
  it("returns Spar / Anbefalt / Ytelse within their limits, all valid (US-13)", () => {
    const res = generate(needs(), seed, games);
    if (!res.ok) throw new Error(res.message);
    expect(res.packages.map((p) => p.tier)).toEqual(["SAVE", "RECOMMENDED", "PERFORMANCE"]);
    for (const p of res.packages) {
      expect(p.validation.ok).toBe(true);
      expect(validate(p.items, seed, { includeOs: true, gaming: true }).ok).toBe(true); // independent re-check
      expect(p.totalNok).toBeLessThanOrEqual(14000 * TIER_LIMIT[p.tier]);
    }
    const [save, rec, perf] = res.packages;
    expect(save.totalNok).toBeLessThan(rec.totalNok);
    expect(perf.score).toBeGreaterThan(rec.score);
    expect(perf.overBudgetNok).toBe(Math.max(0, perf.totalNok - 14000));
    expect(rec.overBudgetNok).toBe(0);
  });

  it("is deterministic", () => {
    const a = generate(needs(), seed, games);
    const b = generate(needs(), seed, games);
    expect(JSON.stringify(a.ok && a.packages.map((p) => p.items))).toBe(JSON.stringify(b.ok && b.packages.map((p) => p.items)));
  });

  it("includes Windows and assembly when asked, and leaves Windows out otherwise", () => {
    const withAll = generate(needs({ assemblyService: true }), seed, games);
    const without = generate(needs({ includeOs: false }), seed, games);
    if (!withAll.ok || !without.ok) throw new Error("expected packages");
    const ids = (r: typeof withAll) => (r.ok ? r.packages[1].items.map((i) => i.componentId) : []);
    expect(ids(withAll)).toContain("acc-assembly-service");
    expect(ids(withAll).some((id) => id.startsWith("os-"))).toBe(true);
    expect(ids(without).some((id) => id.startsWith("os-"))).toBe(false);
  });

  it("adds a Wi-Fi solution when wanted (DP3)", () => {
    const res = generate(needs({ preferences: { wifi: true } }), seed, games);
    if (!res.ok) throw new Error(res.message);
    for (const p of res.packages) expect(p.validation.checklist.find((i) => i.key === "WIFI")?.status).toBe("OK");
  });

  it("respects «small» and «white» preferences when affordable", () => {
    const small = generate(needs({ budgetNok: 20000, preferences: { small: true } }), seed, games);
    const white = generate(needs({ budgetNok: 25000, preferences: { whiteBuild: true } }), seed, games);
    if (!small.ok || !white.ok) throw new Error("expected packages");
    const caseOf = (p: (typeof small.packages)[number]) => seed.find((c) => c.id === p.items.find((i) => i.category === "CASE")?.componentId)!;
    expect((caseOf(small.packages[1]).specs as { formFactorClass: string }).formFactorClass).not.toBe("MID_TOWER");
    expect((caseOf(white.packages[1]).specs as { color: string }).color).toBe("WHITE");
  });

  it("builds a study PC without a graphics card when the CPU has graphics", () => {
    const res = generate(needs({ budgetNok: 9000, uses: ["STUDY"], games: [], targetHz: 60 }), seed, games);
    if (!res.ok) throw new Error(res.message);
    const rec = res.packages.find((p) => p.tier === "RECOMMENDED")!;
    expect(rec.items.some((i) => i.category === "GPU")).toBe(false);
    expect(rec.fps).toEqual([]);
  });

  it("explains every chosen part without jargon", () => {
    const res = generate(needs({ resolution: "1440p" }), seed, games);
    if (!res.ok) throw new Error(res.message);
    const rec = res.packages[1];
    for (const item of rec.items) expect(rec.explanations[item.componentId]?.length).toBeGreaterThan(10);
    const gpu = rec.items.find((i) => i.category === "GPU")!;
    expect(rec.explanations[gpu.componentId]).toContain("1440p");
  });

  it("returns BUDGET_TOO_LOW with a friendly minimum (S10)", () => {
    const res = generate(needs({ budgetNok: 4000 }), seed, games);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.minimumNok).toBeGreaterThan(4000);
    expect(res.minimumNok % 10).toBe(0);
    expect(res.message).toMatch(/^Det laveste vi får til en komplett spill-PC er [\d\s ]+ kr/);
    // …and that minimum really is achievable:
    const ok = generate(needs({ budgetNok: res.minimumNok }), seed, games);
    expect(ok.ok).toBe(true);
  });

  it("upgrade mode keeps owned parts and charges only new ones (S11, US-18)", () => {
    const s = scenarios.find((x) => x.id === "S11")!;
    const res = generate(s.needs!, seed, games, { upgradeCategories: ["GPU"] });
    if (!res.ok) throw new Error(res.message);
    const rec = res.packages.find((p) => p.tier === "RECOMMENDED")!;
    const owned = rec.items.filter((i) => i.owned).map((i) => i.componentId);
    expect(owned).toEqual(expect.arrayContaining(["cpu-amd-ryzen-5-5600", "mb-b550-atx", "ram-ddr4-16-3200", "case-budget-atx-airflow"]));
    const newGpu = seed.find((c) => c.id === rec.items.find((i) => i.category === "GPU")!.componentId)!;
    expect(rec.totalNok).toBe(rec.items.filter((i) => !i.owned).reduce((s2, i) => s2 + seed.find((c) => c.id === i.componentId)!.priceNok, 0));
    expect(rec.totalNok).toBeGreaterThanOrEqual(newGpu.priceNok);
    expect(rec.explanations["mb-b550-atx"]).toContain("fra før");
  });

  it.each([
    [{ uses: ["GAMING"], resolution: "1440p" }, "GAMING_HI"],
    [{ uses: ["GAMING"], games: ["cs2", "valorant"], targetHz: 240 }, "ESPORT"],
    [{ uses: ["GAMING"], games: ["cs2", "cyberpunk-2077"], targetHz: 240 }, "GAMING_1080"],
    [{ uses: ["VIDEO_EDIT", "STREAMING"], games: [] }, "EDIT"],
    [{ uses: ["STUDY", "PROGRAMMING"], games: [] }, "STUDY"],
  ] as const)("selectProfile(%o) → %s", (over, expected) => {
    const n = needs(over as unknown as Partial<NeedsProfile>);
    expect(selectProfile(n, games.filter((g) => n.games.includes(g.slug)))).toBe(expected);
  });
});
