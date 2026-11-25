import { describe, expect, it } from "vitest";
import { run, variant } from "../helpers";
import { r04CoolerHeight as rule } from "@/lib/engine/rules/r04-cooler-height";

describe("R04_COOLER_HEIGHT", () => {
  it("fails the 165 mm cooler in a 150 mm case", () => {
    const [r] = run(rule, ["cooler-tower-x165-dual", "case-compact-m1-matx"]);
    expect(r).toMatchObject({ passed: false, severity: "ERROR", fixSuggestion: { category: "COOLER" } });
    expect(r.messagePlain).toContain("1,5 cm");
  });
  it("passes at exactly the limit (150 mm in 150 mm)", () => {
    expect(run(rule, ["cooler-single-tower-no-paste-150", "case-compact-m1-matx"])[0].passed).toBe(true);
  });
  it("fails 1 mm over the limit", () => {
    const c = variant("cooler-single-tower-155", "151", { heightMm: 151 });
    expect(run(rule, [c.id, "case-compact-m1-matx"], [c])[0].passed).toBe(false);
  });
  it("ignores water coolers and missing parts", () => {
    expect(run(rule, ["cooler-aio-240", "case-compact-m1-matx"])).toEqual([]);
    expect(run(rule, ["cooler-single-tower-155"])).toEqual([]);
  });
});
