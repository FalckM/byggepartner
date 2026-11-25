import { describe, expect, it } from "vitest";
import { run } from "../helpers";
import { adapterPinsNeeded, r11PsuConnectors as rule } from "@/lib/engine/rules/r11-psu-connectors";

describe("R11_PSU_CONNECTORS", () => {
  it("passes a 12V-2x6 card on a PSU with that cable", () => {
    expect(run(rule, ["gpu-rtx-5070-compact", "psu-650-gold-atx31"])[0].passed).toBe(true);
  });
  it("fails a 12V-2x6 card on a PSU with too few 8-pin for the adapter (S05)", () => {
    const [r] = run(rule, ["gpu-rtx-5070-ti-sff", "psu-basic-450-bronze"]);
    expect(r).toMatchObject({ passed: false, severity: "ERROR" });
    expect(r.messagePlain).toBe("Strømforsyningen mangler riktig kabel til skjermkortet.");
  });
  it("warns when the bundled adapter must be used", () => {
    expect(run(rule, ["gpu-rtx-5070-ti-sff", "psu-750-bronze"])[0]).toMatchObject({ passed: false, severity: "WARNING" });
  });
  it("counts 8-pin cables for classic cards", () => {
    expect(run(rule, ["gpu-rtx-5070-ti-3x8", "psu-650-gold-atx31"])[0].passed).toBe(false); // 3 > 2
    expect(run(rule, ["gpu-rtx-5070-ti-3x8", "psu-750-gold-atx31"])[0].passed).toBe(true); // 3 = 3
  });
  it("adapter needs one 8-pin per 150 W, at least two", () => {
    expect(adapterPinsNeeded(115)).toBe(2);
    expect(adapterPinsNeeded(300)).toBe(2);
    expect(adapterPinsNeeded(360)).toBe(3);
  });
  it("is not applicable without a GPU", () => {
    expect(run(rule, ["psu-650-gold-atx31"])).toEqual([]);
  });
});
