// US-11 — Phase 1 gate: the seed catalog is valid, complete and contains the
// deliberate "traps" (chapter 10.1) that later rule tests depend on.
import { describe, expect, it } from "vitest";
import { loadSeedCatalog, loadSeedGames, loadSeedScenarios } from "@/lib/data/seedData";
import { createStaticSource } from "@/lib/data/staticSource";
import { CATEGORIES, type Category, type Component, type ComponentOf } from "@/lib/engine/types";

const catalog = loadSeedCatalog();
const games = loadSeedGames();
const scenarios = loadSeedScenarios();
const byId = new Map(catalog.map((c) => [c.id, c]));

function get<C extends Category>(id: string, category: C): ComponentOf<C> {
  const c = byId.get(id);
  if (!c) throw new Error(`missing ${id}`);
  expect(c.category).toBe(category);
  return c as ComponentOf<C>;
}
const ofCat = <C extends Category>(cat: C) =>
  catalog.filter((c): c is ComponentOf<C> => c.category === cat);

describe("seed catalog", () => {
  it("parses with Zod and has at least 150 components", () => {
    expect(catalog.length).toBeGreaterThanOrEqual(150);
  });

  it("has unique ids and every component flagged as demo data", () => {
    expect(new Set(catalog.map((c) => c.id)).size).toBe(catalog.length);
    expect(catalog.every((c) => c.isDemoData === true)).toBe(true);
  });

  it.each([
    ["CPU", 16],
    ["MOTHERBOARD", 20],
    ["RAM", 14],
    ["GPU", 18],
    ["STORAGE", 14],
    ["PSU", 14],
    ["CASE", 16],
    ["COOLER", 14],
    ["OS", 2],
    ["ACCESSORY", 6],
  ] as const)("has at least %i … %s", (cat, min) => {
    expect(ofCat(cat).length).toBeGreaterThanOrEqual(min);
  });

  it("covers every category", () => {
    for (const cat of CATEGORIES) expect(ofCat(cat).length).toBeGreaterThan(0);
  });

  it("covers all four CPU sockets on both CPU and motherboard side", () => {
    const sockets = ["AM4", "AM5", "LGA1700", "LGA1851"] as const;
    for (const s of sockets) {
      expect(ofCat("CPU").some((c) => c.specs.socket === s)).toBe(true);
      expect(ofCat("MOTHERBOARD").some((m) => m.specs.socket === s)).toBe(true);
    }
  });

  it("has ≥2 CPUs without iGPU and ≥2 with a bundled cooler", () => {
    expect(ofCat("CPU").filter((c) => !c.specs.hasIntegratedGraphics).length).toBeGreaterThanOrEqual(2);
    expect(ofCat("CPU").filter((c) => c.specs.includesCooler).length).toBeGreaterThanOrEqual(2);
  });

  it("has short (≤250 mm) and long (≥330 mm) GPUs and ≥2 with 12V-2x6", () => {
    const gpus = ofCat("GPU");
    expect(gpus.some((g) => g.specs.lengthMm <= 250)).toBe(true);
    expect(gpus.some((g) => g.specs.lengthMm >= 330)).toBe(true);
    expect(gpus.filter((g) => g.specs.powerConnectors.pin16_12v2x6 > 0).length).toBeGreaterThanOrEqual(2);
  });

  it("has ≥3 small cases (mATX/ITX, GPU ≤300 mm, cooler ≤150 mm)", () => {
    const small = ofCat("CASE").filter(
      (c) =>
        !c.specs.supportedMotherboards.includes("ATX") &&
        c.specs.maxGpuLengthMm <= 300 &&
        c.specs.maxCoolerHeightMm <= 150,
    );
    expect(small.length).toBeGreaterThanOrEqual(3);
  });

  it("has the assembly service at 999 kr", () => {
    expect(get("acc-assembly-service", "ACCESSORY").priceNok).toBe(999);
  });
});

describe("deliberate traps (DECISIONS.md D03)", () => {
  it("340 mm GPU", () => expect(get("gpu-rtx-5070-ti-titan-oc", "GPU").specs.lengthMm).toBe(340));
  it("case with 290 mm GPU limit", () =>
    expect(get("case-compact-m1-matx", "CASE").specs.maxGpuLengthMm).toBe(290));
  it("165 mm air cooler", () => {
    const c = get("cooler-tower-x165-dual", "COOLER");
    expect(c.specs.type).toBe("AIR");
    expect(c.specs.heightMm).toBe(165);
  });
  it("SFX-only case", () => expect(get("case-shoebox-s9-itx", "CASE").specs.supportedPsu).toEqual(["SFX"]));
  it("450 W PSU without 12V-2x6", () => {
    const p = get("psu-basic-450-bronze", "PSU");
    expect(p.specs.wattage).toBe(450);
    expect(p.specs.connectors.pin16_12v2x6).toBe(0);
  });
  it("B650 without Ryzen 9000 BIOS support and without flashback", () => {
    const m = get("mb-b650m-legacy-bios", "MOTHERBOARD");
    expect(m.specs.chipset).toBe("B650");
    expect(m.specs.shipsWithBiosSupportFor).not.toContain("RYZEN_9000");
    expect(m.specs.biosFlashback).toBe(false);
  });
  it("CPU without iGPU and without cooler", () => {
    const c = get("cpu-intel-core-i5-14600kf", "CPU");
    expect(c.specs.hasIntegratedGraphics).toBe(false);
    expect(c.specs.includesCooler).toBe(false);
  });
  it("tall RGB RAM (>44 mm)", () =>
    expect(get("ram-ddr5-32-6000-rgb-tall", "RAM").specs.heightMm).toBeGreaterThan(44));
  it("cooler shipped without thermal paste (R18)", () =>
    expect(get("cooler-single-tower-no-paste-150", "COOLER").specs.includesThermalPaste).toBe(false));
});

describe("games and scenarios", () => {
  it("has the games named in the wizard spec", () => {
    const slugs = new Set(games.map((g) => g.slug));
    for (const s of ["cs2", "valorant", "fortnite", "league-of-legends", "minecraft", "cyberpunk-2077"]) {
      expect(slugs.has(s)).toBe(true);
    }
  });

  it("defines S01–S12", () => {
    expect(scenarios.map((s) => s.id)).toEqual(
      Array.from({ length: 12 }, (_, i) => `S${String(i + 1).padStart(2, "0")}`),
    );
  });

  it("only references existing components and games", () => {
    const gameSlugs = new Set(games.map((g) => g.slug));
    for (const s of scenarios) {
      for (const item of s.items ?? []) {
        const c: Component | undefined = byId.get(item.componentId);
        expect(c, `${s.id}: ${item.componentId}`).toBeDefined();
        expect(c?.category).toBe(item.category);
      }
      for (const p of s.needs?.existingParts ?? []) {
        if (p.componentId) expect(byId.has(p.componentId), `${s.id}: ${p.componentId}`).toBe(true);
      }
      for (const g of s.needs?.games ?? []) expect(gameSlugs.has(g), `${s.id}: ${g}`).toBe(true);
    }
  });
});

describe("staticSource", () => {
  const source = createStaticSource(catalog);

  it("lists by category and finds by id", async () => {
    expect((await source.listByCategory("GPU")).every((c) => c.category === "GPU")).toBe(true);
    expect((await source.getById("cpu-amd-ryzen-5-7600"))?.name).toBe("AMD Ryzen 5 7600");
    expect(await source.getById("nope")).toBeNull();
  });

  it("searches by text, price and stock", async () => {
    const res = await source.search({ q: "5070", category: "GPU", maxPrice: 8000 });
    expect(res.length).toBeGreaterThan(0);
    expect(res.every((c) => c.name.includes("5070") && c.priceNok <= 8000)).toBe(true);
    const out = await source.search({ stock: ["OUT"] });
    expect(out.map((c) => c.id)).toContain("gpu-rtx-5080-sff");
  });
});
