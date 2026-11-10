// DP2, US-04 — R12: RAM sticks must fit the slots and stay within max capacity.
import { fail, ok, type Rule } from "./helpers";

export const r12RamSlots: Rule = {
  id: "R12_RAM_SLOTS",
  title: "Det er plass til alt minnet",
  check: ({ mb, rams }) => {
    if (!mb || rams.length === 0) return [];
    const modules = rams.reduce((s, r) => s + r.specs.modules, 0);
    const gb = rams.reduce((s, r) => s + r.specs.capacityGbTotal, 0);
    const ids = [mb.id, ...new Set(rams.map((r) => r.id))];
    const tech = `${modules} brikker / ${mb.specs.memorySlots} spor, ${gb} GB / maks ${mb.specs.maxMemoryGb} GB`;
    if (modules > mb.specs.memorySlots) {
      return [
        fail(
          "R12_RAM_SLOTS",
          "ERROR",
          ids,
          `Hovedkortet har bare plass til ${mb.specs.memorySlots} minnebrikker, men pakken har ${modules}.`,
          tech,
          { action: "REPLACE", category: "RAM" },
        ),
      ];
    }
    if (gb > mb.specs.maxMemoryGb) {
      return [
        fail(
          "R12_RAM_SLOTS",
          "ERROR",
          ids,
          `Hovedkortet støtter maks ${mb.specs.maxMemoryGb} GB minne.`,
          tech,
          { action: "REPLACE", category: "RAM" },
        ),
      ];
    }
    return [ok("R12_RAM_SLOTS", "ERROR", ids, "Det er plass til alt minnet.", tech)];
  },
};
