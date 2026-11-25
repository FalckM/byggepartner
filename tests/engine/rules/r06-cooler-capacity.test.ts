import { describe, expect, it } from "vitest";
import { run, variant } from "../helpers";
import { r06CoolerCapacity as rule } from "@/lib/engine/rules/r06-cooler-capacity";

const CPU = "cpu-intel-core-i5-14600k"; // 125 W
const cooler = (w: number) => variant("cooler-single-tower-155", String(w), { tdpRatingW: w });

describe("R06_COOLER_CAPACITY", () => {
  it.each([
    [124, false, "ERROR"],
    [125, false, "WARNING"],
    [149, false, "WARNING"],
    [150, true, "ERROR"],
  ] as const)("%i W cooler on 125 W CPU → passed=%s (%s)", (w, passed, severity) => {
    const c = cooler(w);
    const [r] = run(rule, [c.id, CPU], [c]);
    expect(r.passed).toBe(passed);
    expect(r.severity).toBe(severity);
  });
  it("uses a plain warning message", () => {
    const c = cooler(130);
    expect(run(rule, [c.id, CPU], [c])[0].messagePlain).toContain("litt svak");
  });
  it("is not applicable without a cooler", () => {
    expect(run(rule, [CPU])).toEqual([]);
  });
});
