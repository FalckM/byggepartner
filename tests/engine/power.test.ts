import { describe, expect, it } from "vitest";
import { estimateLoadW, powerReport, recommendedPsuW } from "@/lib/engine/power";
import { ctxOf } from "./helpers";

describe("power (spec 7.3)", () => {
  it("computes load = CPU×1.25 + GPU + 50 + drives + fans", () => {
    // 65×1.25 + 145 + 50 + 8 (NVMe) + 10 (HDD) + 5 (fan) = 299.25
    const ctx = ctxOf(["cpu-amd-ryzen-5-7600", "gpu-rtx-5060-compact", "ssd-nvme-1tb-gen4", "hdd-2tb", "acc-case-fan-120"]);
    expect(estimateLoadW(ctx)).toBeCloseTo(299.25);
  });
  it("rounds the recommendation up to the nearest 50 W", () => {
    expect(recommendedPsuW(284.25)).toBe(400); // 369.5 → 400
    expect(recommendedPsuW(500)).toBe(650);
  });
  it.each([
    ["psu-550-gold", "TIGHT"],
    ["psu-750-gold-atx31", "GOOD"],
  ] as const)("%s → %s for a ~439 W build", (psu, status) => {
    const p = powerReport(ctxOf(["cpu-amd-ryzen-5-7600", "gpu-rtx-5070-ti-sff", "ssd-nvme-1tb-gen4", psu]));
    expect(p.lastW).toBe(439);
    expect(p.status).toBe(status);
  });
  it("reports TOO_WEAK when the PSU is below the load", () => {
    const p = powerReport(ctxOf(["cpu-amd-ryzen-7-9800x3d", "gpu-rtx-5070-ti-sff", "ssd-nvme-1tb-gen4", "psu-basic-450-bronze"]));
    expect(p).toMatchObject({ lastW: 508, psuW: 450, status: "TOO_WEAK", anbefaltW: 700 });
    expect(p.marginPct).toBeLessThan(0);
  });
  it("is TIGHT (not weak) when the PSU just covers the load", () => {
    expect(powerReport(ctxOf(["cpu-amd-ryzen-5-7600", "gpu-rtx-5070-ti-sff", "ssd-nvme-1tb-gen4", "psu-basic-450-bronze"])).status).toBe("TIGHT");
  });
  it("reports NO_PSU without a power supply", () => {
    expect(powerReport(ctxOf(["cpu-amd-ryzen-5-7600"]))).toMatchObject({ psuW: null, marginPct: null, status: "NO_PSU" });
  });
  it("computes margin in percent of load", () => {
    const p = powerReport(ctxOf(["psu-650-gold-atx31"])); // 50 W load
    expect(p.marginPct).toBe(1200);
  });
});
