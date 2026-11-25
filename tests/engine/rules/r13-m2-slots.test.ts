import { describe, expect, it } from "vitest";
import { failed, run } from "../helpers";
import { r13M2Slots as rule } from "@/lib/engine/rules/r13-m2-slots";

describe("R13_M2_SLOTS", () => {
  it("fails two NVMe drives on a 1-slot board", () => {
    const [r] = run(rule, ["mb-a620m-basic", "ssd-nvme-1tb-gen4", "ssd-nvme-2tb-gen4"]);
    expect(r).toMatchObject({ passed: false, severity: "ERROR" });
    expect(r.messagePlain).toContain("1 lagringsbrikke,");
  });
  it("passes at exactly the slot count", () => {
    expect(failed(run(rule, ["mb-b650-atx-wifi", "ssd-nvme-1tb-gen4*3"]))).toEqual([]);
  });
  it("adds INFO for a Gen5 drive in a Gen4-only board", () => {
    const rs = run(rule, ["mb-b650-atx-wifi", "ssd-nvme-1tb-gen5"]);
    expect(rs[0].passed).toBe(true);
    expect(rs[1]).toMatchObject({ passed: false, severity: "INFO" });
  });
  it("no INFO when the board has Gen5 slots", () => {
    expect(failed(run(rule, ["mb-x870-atx-wifi", "ssd-nvme-1tb-gen5"]))).toEqual([]);
  });
  it("ignores SATA drives and missing board", () => {
    expect(run(rule, ["mb-a620m-basic", "ssd-sata-1tb"])).toEqual([]);
    expect(run(rule, ["ssd-nvme-1tb-gen4"])).toEqual([]);
  });
});
