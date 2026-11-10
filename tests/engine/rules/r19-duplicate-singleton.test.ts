import { describe, expect, it } from "vitest";
import { failed, run } from "../helpers";
import { r19DuplicateSingleton as rule } from "@/lib/engine/rules/r19-duplicate-singleton";

describe("R19_DUPLICATE_SINGLETON", () => {
  it("fails two CPUs", () => {
    const [r] = run(rule, ["cpu-amd-ryzen-5-7600", "cpu-amd-ryzen-7-9700x"]);
    expect(r).toMatchObject({ passed: false, severity: "ERROR", fixSuggestion: { action: "REMOVE", category: "CPU" } });
  });
  it("fails qty 2 of the same PSU and reports each category separately", () => {
    const rs = failed(run(rule, ["psu-650-gold-atx31*2", "case-midtower-mesh", "case-midtower-rgb"]));
    expect(rs.map((r) => r.fixSuggestion?.category)).toEqual(["CASE", "PSU"]);
  });
  it("allows several drives, RAM kits and GPUs", () => {
    expect(failed(run(rule, ["ssd-nvme-1tb-gen4*2", "ram-ddr5-32-6000*2", "gpu-rtx-5060-compact*2"]))).toEqual([]);
  });
  it("is not applicable for an empty build", () => {
    expect(run(rule, [])).toEqual([]);
  });
});
