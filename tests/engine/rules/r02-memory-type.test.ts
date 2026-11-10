import { describe, expect, it } from "vitest";
import { failed, run, variant } from "../helpers";
import { r02MemoryType as rule } from "@/lib/engine/rules/r02-memory-type";

describe("R02_MEMORY_TYPE", () => {
  it("passes DDR5 on a DDR5 board with a DDR5 CPU", () => {
    const rs = run(rule, ["cpu-amd-ryzen-5-7600", "mb-b650-atx-wifi", "ram-ddr5-32-6000"]);
    expect(rs.every((r) => r.passed)).toBe(true);
  });
  it("fails DDR4 RAM on a DDR5 board (S07)", () => {
    const [r] = failed(run(rule, ["cpu-amd-ryzen-5-7600", "mb-b650-atx-wifi", "ram-ddr4-32-3200"]));
    expect(r).toMatchObject({ severity: "ERROR", fixSuggestion: { category: "RAM" } });
    expect(r.messagePlain).toContain("DDR4");
  });
  it("fails RAM the CPU cannot use when no board is chosen", () => {
    const [r] = failed(run(rule, ["cpu-amd-ryzen-5-7600", "ram-ddr4-16-3200"]));
    expect(r.messagePlain).toContain("prosessoren");
  });
  it("Intel 14th gen supports both DDR4 and DDR5 boards", () => {
    expect(failed(run(rule, ["cpu-intel-core-i5-14400f", "mb-b760m-ddr4", "ram-ddr4-16-3200"]))).toEqual([]);
    expect(failed(run(rule, ["cpu-intel-core-i5-14400f", "mb-b760m-ddr5-wifi", "ram-ddr5-32-5600"]))).toEqual([]);
  });
  it("fails a board whose memory type the CPU does not support", () => {
    const ddr4OnlyAm5 = variant("cpu-amd-ryzen-5-7600", "ddr4", { memorySupport: ["DDR4"] });
    const rs = failed(run(rule, [ddr4OnlyAm5.id, "mb-b650-atx-wifi"], [ddr4OnlyAm5]));
    expect(rs[0].fixSuggestion?.category).toBe("MOTHERBOARD");
  });
  it("de-duplicates identical results for qty > 1", () => {
    expect(run(rule, ["mb-b650-atx-wifi", "ram-ddr4-16-3200*2"])).toHaveLength(1);
  });
  it("is not applicable for RAM alone", () => {
    expect(run(rule, ["ram-ddr5-32-6000"])).toEqual([]);
  });
});
