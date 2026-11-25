import { describe, expect, it } from "vitest";
import { run, variant } from "../helpers";
import { r12RamSlots as rule } from "@/lib/engine/rules/r12-ram-slots";

describe("R12_RAM_SLOTS", () => {
  it("fails 4 sticks on a 2-slot board", () => {
    const [r] = run(rule, ["mb-a520m-basic", "ram-ddr4-32-3200-4x8"]);
    expect(r).toMatchObject({ passed: false, severity: "ERROR", fixSuggestion: { category: "RAM" } });
    expect(r.messagePlain).toContain("2 minnebrikker");
  });
  it("passes exactly at max capacity (64 GB on a 64 GB board)", () => {
    expect(run(rule, ["mb-a520m-basic", "ram-ddr4-64-3200"])[0].passed).toBe(true);
  });
  it("fails above max capacity", () => {
    const big = variant("ram-ddr4-64-3200", "96", { capacityGbTotal: 96 });
    expect(run(rule, ["mb-a520m-basic", big.id], [big])[0].messagePlain).toContain("maks 64 GB");
  });
  it("sums two kits (qty 2) into 4 slots", () => {
    expect(run(rule, ["mb-b550-atx", "ram-ddr4-32-3200*2"])[0].passed).toBe(true);
    expect(run(rule, ["mb-a520m-basic", "ram-ddr4-16-3200*2"])[0].passed).toBe(false);
  });
  it("is not applicable without RAM", () => {
    expect(run(rule, ["mb-a520m-basic"])).toEqual([]);
  });
});
