import { describe, expect, it } from "vitest";
import { run } from "../helpers";
import { r09PsuForm as rule } from "@/lib/engine/rules/r09-psu-form";

describe("R09_PSU_FORM", () => {
  it("fails an ATX PSU in an SFX-only case", () => {
    const [r] = run(rule, ["psu-650-gold-atx31", "case-shoebox-s9-itx"]);
    expect(r).toMatchObject({ passed: false, severity: "ERROR", fixSuggestion: { category: "PSU" } });
    expect(r.messagePlain).toContain("mini-strømforsyning");
  });
  it("fails an SFX PSU in an ATX-only case", () => {
    expect(run(rule, ["psu-sfx-650-gold", "case-midtower-mesh"])[0].messagePlain).toContain("brakett");
  });
  it("fails a PSU that is too long", () => {
    const [r] = run(rule, ["psu-750-bronze", "case-office-matx"]); // 160 mm vs 150 mm
    expect(r.passed).toBe(false);
    expect(r.messagePlain).toContain("for lang");
  });
  it("passes at exactly the max length", () => {
    expect(run(rule, ["psu-850-gold-atx31", "case-office-matx"])[0].passed).toBe(true); // 150 = 150
  });
  it("passes both formats in a case supporting both", () => {
    expect(run(rule, ["psu-sfx-650-gold", "case-cube-mini-itx"])[0].passed).toBe(true);
    expect(run(rule, ["psu-650-gold-atx31", "case-cube-mini-itx"])[0].passed).toBe(true);
  });
  it("is not applicable without a PSU", () => {
    expect(run(rule, ["case-midtower-mesh"])).toEqual([]);
  });
});
