// DP2, US-04 — R13: NVMe drives need M.2 slots; a Gen5 drive in a Gen4 slot works but slower (INFO).
import type { RuleResult } from "../report";
import { fail, ok, type Rule } from "./helpers";

export const r13M2Slots: Rule = {
  id: "R13_M2_SLOTS",
  title: "Lagringsbrikkene får plass på hovedkortet",
  check: ({ mb, storage }) => {
    const nvme = storage.filter((s) => s.specs.type === "NVME");
    if (!mb || nvme.length === 0) return [];
    const ids = [mb.id, ...new Set(nvme.map((s) => s.id))];
    const gen5 = nvme.filter((s) => s.specs.interface === "M2_PCIE5").length;
    const tech = `${nvme.length} NVMe / ${mb.specs.m2Slots} M.2-spor (${mb.specs.m2Pcie5Slots} PCIe 5.0), ${gen5} Gen5-disk(er)`;
    if (nvme.length > mb.specs.m2Slots) {
      return [
        fail(
          "R13_M2_SLOTS",
          "ERROR",
          ids,
          `Hovedkortet har plass til ${mb.specs.m2Slots} lagringsbrikke${mb.specs.m2Slots === 1 ? "" : "r"}, men pakken har ${nvme.length}.`,
          tech,
          { action: "REPLACE", category: "MOTHERBOARD" },
        ),
      ];
    }
    const out: RuleResult[] = [ok("R13_M2_SLOTS", "ERROR", ids, "Lagringsbrikkene får plass på hovedkortet.", tech)];
    if (gen5 > mb.specs.m2Pcie5Slots) {
      out.push(
        fail(
          "R13_M2_SLOTS",
          "INFO",
          ids,
          "Den ekstra raske lagringen virker, men hovedkortet kan ikke utnytte full fart. Du merker det sjelden.",
          tech,
        ),
      );
    }
    return out;
  },
};
