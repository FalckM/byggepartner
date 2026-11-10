import { describe, expect, it } from "vitest";
import { run } from "../helpers";
import { r10PsuWattage as rule } from "@/lib/engine/rules/r10-psu-wattage";

describe("R10_PSU_WATTAGE", () => {
  it("fails a 450 W PSU with 9800X3D + RTX 5070 Ti (S05)", () => {
    const [r] = run(rule, ["cpu-amd-ryzen-7-9800x3d", "gpu-rtx-5070-ti-sff", "ssd-nvme-1tb-gen4", "psu-basic-450-bronze"]);
    expect(r).toMatchObject({ passed: false, severity: "ERROR", fixSuggestion: { category: "PSU" } });
    expect(r.messagePlain).toContain("700 W"); // recommended
  });
  it("warns when margin is under 30 %", () => {
    // 81.25 + 300 + 50 + 8 = 439 W load; 550 W = 1.25×
    const [r] = run(rule, ["cpu-amd-ryzen-5-7600", "gpu-rtx-5070-ti-sff", "ssd-nvme-1tb-gen4", "psu-550-gold"]);
    expect(r).toMatchObject({ passed: false, severity: "WARNING" });
  });
  it("passes with a comfortable margin and states it in plain words", () => {
    const [r] = run(rule, ["cpu-amd-ryzen-5-7600", "gpu-rtx-5060-compact", "ssd-nvme-1tb-gen4", "psu-650-gold-atx31"]);
    expect(r.passed).toBe(true);
    expect(r.messagePlain).toMatch(/med \d+ % margin/);
  });
  it("is not applicable without a PSU", () => {
    expect(run(rule, ["cpu-amd-ryzen-5-7600"])).toEqual([]);
  });
  it("still works for a PSU-only build", () => {
    expect(run(rule, ["psu-650-gold-atx31"])[0].passed).toBe(true);
  });
});
