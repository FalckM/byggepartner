import { describe, expect, it } from "vitest";
import { run, variant } from "../helpers";
import { r03GpuLength as rule } from "@/lib/engine/rules/r03-gpu-length";

const CASE = "case-compact-m1-matx"; // max 290 mm
const gpu = (len: number) => variant("gpu-rtx-5060-compact", String(len), { lengthMm: len });

describe("R03_GPU_LENGTH", () => {
  it("fails the 340 mm card in the 290 mm case (RESP-04) with a plain cm message", () => {
    const [r] = run(rule, ["gpu-rtx-5070-ti-titan-oc", CASE]);
    expect(r).toMatchObject({ passed: false, severity: "ERROR", fixSuggestion: { category: "CASE" } });
    expect(r.messagePlain).toBe("Skjermkortet er 5 cm for langt for kabinettet.");
  });
  it.each([
    [291, false, "ERROR"],
    [290, false, "WARNING"],
    [281, false, "WARNING"],
    [280, true, "ERROR"],
  ] as const)("length %i mm → passed=%s (%s)", (len, passed, severity) => {
    const g = gpu(len);
    const [r] = run(rule, [g.id, CASE], [g]);
    expect(r.passed).toBe(passed);
    expect(r.severity).toBe(severity);
  });
  it("formats sub-centimetre overshoot with a comma", () => {
    const g = gpu(295);
    expect(run(rule, [g.id, CASE], [g])[0].messagePlain).toContain("0,5 cm");
  });
  it("checks each distinct GPU once", () => {
    expect(run(rule, ["gpu-rtx-5060-compact*2", "case-midtower-mesh"])).toHaveLength(1);
  });
  it("is not applicable without a case", () => {
    expect(run(rule, ["gpu-rtx-5060-compact"])).toEqual([]);
  });
});
