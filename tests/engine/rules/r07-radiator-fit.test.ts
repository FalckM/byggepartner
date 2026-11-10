import { describe, expect, it } from "vitest";
import { run } from "../helpers";
import { r07RadiatorFit as rule } from "@/lib/engine/rules/r07-radiator-fit";

describe("R07_RADIATOR_FIT", () => {
  it("fails a 360 mm radiator in a case that only fits 240 mm", () => {
    expect(run(rule, ["cooler-aio-360", "case-compact-m1-matx"])[0]).toMatchObject({ passed: false, severity: "ERROR" });
  });
  it("passes a 240 mm radiator in the front slot", () => {
    expect(run(rule, ["cooler-aio-240", "case-compact-m1-matx"])[0].passed).toBe(true);
  });
  it("passes when only the top supports the size", () => {
    expect(run(rule, ["cooler-aio-360", "case-dual-chamber-matx"])[0].passed).toBe(true);
  });
  it("fails in a case with no radiator support at all", () => {
    expect(run(rule, ["cooler-aio-240", "case-shoebox-s9-itx"])[0].passed).toBe(false);
  });
  it("ignores air coolers", () => {
    expect(run(rule, ["cooler-single-tower-155", "case-compact-m1-matx"])).toEqual([]);
  });
});
