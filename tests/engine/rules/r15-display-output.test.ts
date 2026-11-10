import { describe, expect, it } from "vitest";
import { run } from "../helpers";
import { r15DisplayOutput as rule } from "@/lib/engine/rules/r15-display-output";

describe("R15_DISPLAY_OUTPUT", () => {
  it("fails a CPU without iGPU and no graphics card, suggesting to add one", () => {
    const [r] = run(rule, ["cpu-intel-core-i5-14600kf"]);
    expect(r).toMatchObject({ passed: false, severity: "ERROR", fixSuggestion: { action: "ADD", category: "GPU" } });
    expect(r.messagePlain).toContain("Du trenger et skjermkort");
  });
  it("passes with iGPU and no card", () => {
    expect(run(rule, ["cpu-amd-ryzen-5-7600"])[0].passed).toBe(true);
  });
  it("passes with a graphics card", () => {
    expect(run(rule, ["cpu-intel-core-i5-14600kf", "gpu-rtx-5060-compact"])[0].passed).toBe(true);
  });
  it("is not applicable without a CPU", () => {
    expect(run(rule, ["gpu-rtx-5060-compact"])).toEqual([]);
  });
});
