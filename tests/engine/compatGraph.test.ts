// US-21 / US-19 — compatibility graph and canned PC-builder answers.
import { describe, expect, it } from "vitest";
import { builderAnswers } from "@/lib/engine/builderAnswers";
import { compatGraph } from "@/lib/engine/compatGraph";
import { findJargon } from "@/lib/engine/explain";
import { validate } from "@/lib/engine/validate";
import { BASE_IDS, baseWith, items, seed } from "./helpers";

const graph = (ids: string[]) => {
  const it = items(ids);
  return compatGraph(it, seed, validate(it, seed));
};

describe("compatGraph", () => {
  it("has one node per main part (no OS/accessories) and green edges for a valid build", () => {
    const g = graph(BASE_IDS);
    expect(g.nodes.map((n) => n.category).sort()).toEqual(["CASE", "CPU", "GPU", "MOTHERBOARD", "PSU", "RAM", "STORAGE"]);
    expect(g.edges.length).toBeGreaterThan(5);
    expect(g.edges.every((e) => e.status === "OK")).toBe(true);
    expect(g.edges.find((e) => e.key === "CPU-MOTHERBOARD")?.results.map((r) => r.ruleId)).toContain("R01_SOCKET");
  });

  it("marks the failing wire red and sorts problems first", () => {
    const g = graph(baseWith({ ram: "ram-ddr4-32-3200" }));
    expect(g.edges[0]).toMatchObject({ key: "MOTHERBOARD-RAM", status: "ERROR" });
  });

  it("shows warnings in yellow", () => {
    const g = graph(baseWith({ cpu: "cpu-amd-ryzen-7-9800x3d", mb: "mb-b650m-legacy-bios", case: "case-midtower-mesh" }, ["cooler-single-tower-155"]));
    expect(g.edges.find((e) => e.key === "CPU-MOTHERBOARD")?.status).toBe("WARNING");
  });
});

describe("builderAnswers", () => {
  it("answers in plain words based on the build", () => {
    const it = items(BASE_IDS);
    const qa = builderAnswers(it, seed, validate(it, seed));
    expect(qa.map((q) => q.id)).toEqual(expect.arrayContaining(["fits", "paste", "upgrade", "assembly"]));
    expect(qa.find((q) => q.id === "fits")?.answer).toMatch(/^Ja\./);
    for (const q of qa) expect(findJargon(q.answer), q.id).toEqual([]);
  });

  it("explains what is wrong when the build does not fit", () => {
    const it = items(baseWith({ ram: "ram-ddr4-32-3200" }));
    expect(builderAnswers(it, seed, validate(it, seed)).find((q) => q.id === "fits")?.answer).toMatch(/^Ikke helt ennå: minnet/);
  });

  it("knows about paste and owned parts", () => {
    const it = [...items(baseWith({}, ["cooler-single-tower-no-paste-150"])), { category: "CASE" as const, componentId: "case-budget-atx-airflow", qty: 1, owned: true }];
    const qa = builderAnswers(it, seed, validate(it, seed), { budgetNok: 6000, includeOs: false, uses: ["GAMING"], games: ["cs2"], resolution: "1080p", targetHz: 144, preferences: {}, longevityYears: 3, assemblyService: false });
    expect(qa.find((q) => q.id === "paste")?.answer).toMatch(/^Ja – /);
    expect(qa.find((q) => q.id === "owned")).toBeDefined();
    expect(qa.find((q) => q.id === "games")).toBeDefined();
  });
});
