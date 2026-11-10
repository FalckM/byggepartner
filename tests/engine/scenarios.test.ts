// US-11 — Phase 2 gate: validation scenarios S04–S09 pass (same runner as /admin/scenarier).
import { describe, expect, it } from "vitest";
import { loadSeedScenarios } from "@/lib/data/seedData";
import { runScenario } from "@/lib/engine/scenarioRunner";
import type { Scenario } from "@/lib/engine/types";
import { seed } from "./helpers";

const scenarios = loadSeedScenarios();

describe("validation scenarios", () => {
  it.each(["S04", "S05", "S06", "S07", "S08", "S09"])("%s passes", (id) => {
    const s = scenarios.find((x) => x.id === id)!;
    const run = runScenario(s, seed);
    expect(run.checks.length).toBeGreaterThan(0);
    expect(run.checks.filter((c) => !c.passed), JSON.stringify(run.checks)).toEqual([]);
    expect(run.status).toBe("PASS");
  });

  it("marks generator scenarios as pending until phase 3", () => {
    expect(runScenario(scenarios.find((x) => x.id === "S01")!, seed).status).toBe("PENDING");
  });

  it("reports FAIL when expectations are not met", () => {
    const s: Scenario = { ...scenarios.find((x) => x.id === "S06")!, expect: { ok: true, errorRules: ["R03_GPU_LENGTH"], warningRules: ["R16_BIOS"], checklistMissing: ["CPU" as const], checklistPresent: ["WIFI" as const], hasFixSuggestion: true } };
    const run = runScenario(s, seed);
    expect(run.status).toBe("FAIL");
    expect(run.checks.filter((c) => !c.passed).map((c) => c.name)).toEqual([
      "ok = true",
      "R03_GPU_LENGTH ERROR",
      "R16_BIOS WARNING",
      "Sjekkliste ❌ CPU",
      "Sjekkliste ✅ WIFI",
    ]);
  });
});
