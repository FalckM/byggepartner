import { describe, expect, it } from "vitest";
import { run } from "../helpers";
import { r08FormFactor as rule } from "@/lib/engine/rules/r08-form-factor";

describe("R08_FORM_FACTOR", () => {
  it("fails an ATX board in an mATX case", () => {
    expect(run(rule, ["mb-b650-atx-wifi", "case-compact-m1-matx"])[0]).toMatchObject({
      passed: false,
      fixSuggestion: { category: "CASE" },
    });
  });
  it("passes mATX in mATX and ITX in ATX", () => {
    expect(run(rule, ["mb-b850m-wifi", "case-compact-m1-matx"])[0].passed).toBe(true);
    expect(run(rule, ["mb-b650i-itx-wifi", "case-midtower-mesh"])[0].passed).toBe(true);
  });
  it("is not applicable without a case", () => {
    expect(run(rule, ["mb-b650-atx-wifi"])).toEqual([]);
  });
});
