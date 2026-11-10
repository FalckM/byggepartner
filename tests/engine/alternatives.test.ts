// US-07 — Swap a part and only see alternatives that fit.
import { describe, expect, it } from "vitest";
import { compatibleAlternatives, perfValue } from "@/lib/engine/alternatives";
import { BASE, BASE_IDS, baseWith, comp, items, seed } from "./helpers";

describe("compatibleAlternatives", () => {
  it("never offers a GPU that is too long for the case (RESP-04)", () => {
    const build = items(baseWith({ mb: "mb-b850m-wifi", case: "case-compact-m1-matx" }));
    const { compatible, incompatible } = compatibleAlternatives(build, "GPU", seed);
    expect(compatible.every((c) => c.component.category === "GPU" && (c.component.specs as { lengthMm: number }).lengthMm <= 290)).toBe(true);
    const titan = incompatible.find((i) => i.component.id === "gpu-rtx-5070-ti-titan-oc")!;
    expect(titan.ruleIds).toContain("R03_GPU_LENGTH");
    expect(titan.reasons[0]).toContain("for langt");
  });

  it("reports price and performance deltas against the current part", () => {
    const { compatible } = compatibleAlternatives(items(BASE_IDS), "GPU", seed);
    const c5070 = compatible.find((c) => c.component.id === "gpu-rtx-5070-compact")!;
    expect(c5070.priceDeltaNok).toBe(6990 - 3690);
    expect(c5070.perfDeltaPct).toBe(Math.round(((55 - 35) / 35) * 100));
    expect(compatible.some((c) => c.component.id === BASE.gpu)).toBe(false);
  });

  it("puts out-of-stock items in the incompatible list", () => {
    const { incompatible } = compatibleAlternatives(items(BASE_IDS), "GPU", seed);
    expect(incompatible.find((i) => i.component.id === "gpu-rtx-5080-sff")?.reasons).toEqual(["Utsolgt for øyeblikket."]);
  });

  it("only offers boards with the right socket and memory", () => {
    const { compatible } = compatibleAlternatives(items(BASE_IDS), "MOTHERBOARD", seed);
    expect(compatible.length).toBeGreaterThan(3);
    for (const c of compatible) {
      const s = c.component.specs as { socket: string; memoryType: string };
      expect(s.socket).toBe("AM5");
      expect(s.memoryType).toBe("DDR5");
    }
  });

  it("carries WARNINGs and sorts warning-free candidates first", () => {
    const { compatible } = compatibleAlternatives(items(BASE_IDS), "PSU", seed);
    const firstWarn = compatible.findIndex((c) => c.warnings.length > 0);
    if (firstWarn >= 0) expect(compatible.slice(firstWarn).every((c) => c.warnings.length > 0)).toBe(true);
  });

  it("acts as 'add' when the category is empty, and filters accessories by kind", () => {
    const { compatible } = compatibleAlternatives(items(BASE_IDS), "ACCESSORY", seed, { accessoryKind: "THERMAL_PASTE" });
    expect(compatible.map((c) => c.component.id).sort()).toEqual(["acc-thermal-paste-basic", "acc-thermal-paste-pro"]);
    expect(compatible[0].priceDeltaNok).toBe(compatible[0].component.priceNok);
  });

  it("defaults the accessory kind to the replaced item's kind", () => {
    const { compatible } = compatibleAlternatives(items([...BASE_IDS, "acc-wifi-usb-ax"]), "ACCESSORY", seed);
    expect(compatible.map((c) => c.component.id)).toEqual(["acc-wifi-pcie-ax"]);
  });

  it("perfValue covers performance categories only", () => {
    expect(perfValue(comp("gpu-rtx-5070-compact"))).toBe(55);
    expect(perfValue(comp("ram-ddr5-32-6000"))).toBe(32);
    expect(perfValue(comp("ssd-nvme-2tb-gen4"))).toBe(2000);
    expect(perfValue(comp("cpu-amd-ryzen-5-7600"))).toBeCloseTo(64 * 0.7 + 50 * 0.3);
    expect(perfValue(comp("case-midtower-mesh"))).toBeNull();
  });
});
