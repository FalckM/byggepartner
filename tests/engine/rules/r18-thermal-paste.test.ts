import { describe, expect, it } from "vitest";
import { run } from "../helpers";
import { r18ThermalPaste as rule } from "@/lib/engine/rules/r18-thermal-paste";

describe("R18_THERMAL_PASTE", () => {
  it("flags a cooler without paste and suggests paste products", () => {
    const [r] = run(rule, ["cooler-single-tower-no-paste-150"]);
    expect(r).toMatchObject({ passed: false, severity: "INFO", fixSuggestion: { action: "ADD", category: "ACCESSORY" } });
    expect(r.fixSuggestion?.candidateIds?.[0]).toBe("acc-thermal-paste-basic");
  });
  it("passes once paste is added", () => {
    expect(run(rule, ["cooler-single-tower-no-paste-150", "acc-thermal-paste-pro"])[0].passed).toBe(true);
  });
  it("passes a cooler with pre-applied paste", () => {
    expect(run(rule, ["cooler-single-tower-155"])[0].passed).toBe(true);
  });
  it("is not applicable without a separate cooler", () => {
    expect(run(rule, ["cpu-amd-ryzen-5-7600"])).toEqual([]);
  });
});
