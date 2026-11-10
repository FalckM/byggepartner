// DP1, US-08, spec 13 — standard mode must contain no unexplained jargon.
import { describe, expect, it } from "vitest";
import { explainComponent, findJargon, RULE_EXPLANATION } from "@/lib/engine/explain";
import { powerReport } from "@/lib/engine/power";
import type { NeedsProfile } from "@/lib/engine/types";
import { validate } from "@/lib/engine/validate";
import { loadSeedScenarios } from "@/lib/data/seedData";
import { comp, ctxOf, seed } from "./helpers";

const needs = (over: Partial<NeedsProfile> = {}): NeedsProfile => ({
  budgetNok: 14000,
  includeOs: true,
  uses: ["GAMING", "STUDY"],
  games: ["cs2"],
  resolution: "1080p",
  targetHz: 144,
  preferences: {},
  longevityYears: 5,
  assemblyService: false,
  ...over,
});

const PROFILES: { needs?: NeedsProfile; gameNames?: string[] }[] = [
  {},
  { needs: needs(), gameNames: ["Counter-Strike 2", "Fortnite"] },
  { needs: needs({ resolution: "1440p" }) },
  { needs: needs({ resolution: "2160p", uses: ["VIDEO_EDIT"], longevityYears: 3, targetHz: 60 }) },
  { needs: needs({ uses: ["STUDY"], games: [], preferences: { quiet: true, small: true, wifi: true, whiteBuild: true } }) },
];

describe("findJargon", () => {
  it("detects banned terms as whole words, case-insensitive", () => {
    expect(findJargon("CPU-ens TDP er 65 W")).toEqual(["tdp"]);
    expect(findJargon("Støtter PCIe 5.0 og ny sokkel")).toEqual(["sokkel", "pcie"]);
    expect(findJargon("Alt passer sammen")).toEqual([]);
  });
});

describe("explainComponent", () => {
  it("never uses unexplained jargon, for every component and profile", () => {
    for (const c of seed) {
      for (const p of PROFILES) {
        const text = explainComponent(c, p);
        expect(text.length, c.id).toBeGreaterThan(10);
        expect(findJargon(text), `${c.id}: ${text}`).toEqual([]);
      }
    }
  });

  it("mentions 1440p when the GPU got a bigger budget share", () => {
    expect(explainComponent(comp("gpu-rtx-5070-compact"), { needs: needs({ resolution: "1440p" }) })).toContain("1440p");
  });

  it("uses the power report for the PSU", () => {
    const ctx = ctxOf(["cpu-amd-ryzen-5-7600", "gpu-rtx-5060-compact", "psu-650-gold-atx31"]);
    const text = explainComponent(comp("psu-650-gold-atx31"), { power: powerReport(ctx) });
    expect(text).toMatch(/ca\. \d+ W/);
    expect(text).toContain("margin");
  });
});

describe("plain messages", () => {
  it("rule explanations contain no jargon", () => {
    for (const [id, text] of Object.entries(RULE_EXPLANATION)) expect(findJargon(text), id).toEqual([]);
  });

  it("every messagePlain and checklist text produced by the scenarios is jargon-free", () => {
    const builds = loadSeedScenarios().flatMap((s) => (s.items ? [s.items] : []));
    for (const b of builds) {
      const r = validate(b, seed, { wantsWifi: true, gaming: true });
      for (const x of r.results) expect(findJargon(x.messagePlain), `${x.ruleId}: ${x.messagePlain}`).toEqual([]);
      for (const i of r.checklist) {
        expect(findJargon(i.message), i.message).toEqual([]);
        expect(findJargon(i.label), i.label).toEqual([]);
      }
    }
  });
});
