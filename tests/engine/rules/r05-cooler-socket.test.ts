import { describe, expect, it } from "vitest";
import { run } from "../helpers";
import { r05CoolerSocket as rule } from "@/lib/engine/rules/r05-cooler-socket";

describe("R05_COOLER_SOCKET", () => {
  it("fails an AM4-only cooler on an AM5 CPU", () => {
    expect(run(rule, ["cooler-legacy-am4-tower", "cpu-amd-ryzen-5-7600"])[0]).toMatchObject({
      passed: false,
      severity: "ERROR",
      fixSuggestion: { category: "COOLER" },
    });
  });
  it("passes the AM4-only cooler on an AM4 CPU", () => {
    expect(run(rule, ["cooler-legacy-am4-tower", "cpu-amd-ryzen-5-5600"])[0].passed).toBe(true);
  });
  it("is not applicable without a CPU", () => {
    expect(run(rule, ["cooler-legacy-am4-tower"])).toEqual([]);
  });
});
