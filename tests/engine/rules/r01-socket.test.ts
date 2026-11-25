import { describe, expect, it } from "vitest";
import { failed, run } from "../helpers";
import { r01Socket as rule } from "@/lib/engine/rules/r01-socket";

describe("R01_SOCKET", () => {
  it("passes when sockets match", () => {
    const rs = run(rule, ["cpu-amd-ryzen-5-7600", "mb-b650-atx-wifi"]);
    expect(rs).toHaveLength(1);
    expect(rs[0].passed).toBe(true);
  });
  it("fails AM5 CPU on LGA1700 board, suggests replacing the motherboard", () => {
    const [r] = run(rule, ["cpu-amd-ryzen-5-7600", "mb-b760m-ddr5-wifi"]);
    expect(r).toMatchObject({ passed: false, severity: "ERROR", fixSuggestion: { action: "REPLACE", category: "MOTHERBOARD" } });
    expect(r.messageTechnical).toContain("AM5");
  });
  it("fails AM4 CPU on AM5 board (same vendor, different generation)", () => {
    expect(failed(run(rule, ["cpu-amd-ryzen-5-5600", "mb-b650-atx-wifi"]))).toHaveLength(1);
  });
  it("is not applicable without both parts", () => {
    expect(run(rule, ["cpu-amd-ryzen-5-7600"])).toEqual([]);
    expect(run(rule, ["mb-b650-atx-wifi"])).toEqual([]);
  });
});
