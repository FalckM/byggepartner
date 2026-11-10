import { describe, expect, it } from "vitest";
import { run } from "../helpers";
import { r16Bios as rule } from "@/lib/engine/rules/r16-bios";

describe("R16_BIOS", () => {
  it("warns for Ryzen 9000 on an older B650 without flashback (S09)", () => {
    const [r] = run(rule, ["cpu-amd-ryzen-7-9800x3d", "mb-b650m-legacy-bios"]);
    expect(r).toMatchObject({ passed: false, severity: "WARNING" });
    expect(r.messagePlain).toContain("gratis ved montering");
  });
  it("is only INFO when the board has BIOS flashback", () => {
    expect(run(rule, ["cpu-amd-ryzen-7-9800x3d", "mb-b650-atx-flashback"])[0]).toMatchObject({ passed: false, severity: "INFO" });
  });
  it("passes a supported generation", () => {
    expect(run(rule, ["cpu-amd-ryzen-5-7600", "mb-b650m-legacy-bios"])[0].passed).toBe(true);
  });
  it("warns for Intel 14th gen on an H610 shipped for 12/13th gen", () => {
    expect(run(rule, ["cpu-intel-core-i5-14400f", "mb-h610m-ddr4"])[0].severity).toBe("WARNING");
  });
  it("is not applicable on socket mismatch (R01 handles that)", () => {
    expect(run(rule, ["cpu-amd-ryzen-5-7600", "mb-b760m-ddr5-wifi"])).toEqual([]);
  });
});
