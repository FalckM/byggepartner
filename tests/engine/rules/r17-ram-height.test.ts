import { describe, expect, it } from "vitest";
import { run, variant } from "../helpers";
import { r17RamHeight as rule } from "@/lib/engine/rules/r17-ram-height";

describe("R17_RAM_HEIGHT", () => {
  it("warns tall RGB RAM under a cooler that overhangs the slots", () => {
    expect(run(rule, ["cooler-tower-x165-dual", "ram-ddr5-32-6000-rgb-tall"])[0]).toMatchObject({
      passed: false,
      severity: "WARNING",
      fixSuggestion: { category: "RAM" },
    });
  });
  it("passes tall RAM with a single-tower cooler", () => {
    expect(run(rule, ["cooler-single-tower-155", "ram-ddr5-32-6000-rgb-tall"])[0].passed).toBe(true);
  });
  it("passes normal RAM under the big cooler, and exactly 40 mm", () => {
    expect(run(rule, ["cooler-tower-x165-dual", "ram-ddr5-32-6000"])[0].passed).toBe(true);
    const r40 = variant("ram-ddr5-32-6000", "40", { heightMm: 40 });
    expect(run(rule, ["cooler-tower-x165-dual", r40.id], [r40])[0].passed).toBe(true);
  });
  it("ignores water coolers", () => {
    expect(run(rule, ["cooler-aio-240", "ram-ddr5-32-6000-rgb-tall"])).toEqual([]);
  });
});
