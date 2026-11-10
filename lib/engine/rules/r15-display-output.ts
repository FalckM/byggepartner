// DP2, US-04 — R15: without a graphics card, the CPU must have integrated graphics.
import { fail, ok, type Rule } from "./helpers";

export const r15DisplayOutput: Rule = {
  id: "R15_DISPLAY_OUTPUT",
  title: "PC-en kan vise bilde på skjermen",
  check: ({ cpu, gpus }) => {
    if (!cpu) return [];
    if (gpus.length > 0) {
      return [ok("R15_DISPLAY_OUTPUT", "ERROR", [cpu.id, gpus[0].id], "Skjermen kobles til skjermkortet.", "Diskret GPU til stede")];
    }
    if (cpu.specs.hasIntegratedGraphics) {
      return [
        ok("R15_DISPLAY_OUTPUT", "ERROR", [cpu.id], "Prosessoren har innebygd grafikk – skjermen kobles til hovedkortet.", "iGPU OK"),
      ];
    }
    return [
      fail(
        "R15_DISPLAY_OUTPUT",
        "ERROR",
        [cpu.id],
        "Du trenger et skjermkort – denne prosessoren har ikke innebygd grafikk.",
        "Ingen GPU og CPU uten iGPU",
        { action: "ADD", category: "GPU" },
      ),
    ];
  },
};
