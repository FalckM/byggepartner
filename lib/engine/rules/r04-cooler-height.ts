// DP2, US-04 — R04: air cooler must be low enough for the side panel to close.
import { fmtCm } from "../format";
import { fail, ok, type Rule } from "./helpers";

export const r04CoolerHeight: Rule = {
  id: "R04_COOLER_HEIGHT",
  title: "Kjøleren får plass i kabinettet",
  check: ({ cooler, pcCase }) => {
    if (!cooler || !pcCase || cooler.specs.type !== "AIR" || cooler.specs.heightMm === undefined) return [];
    const h = cooler.specs.heightMm;
    const max = pcCase.specs.maxCoolerHeightMm;
    const ids = [cooler.id, pcCase.id];
    const tech = `Kjøler ${h} mm, kabinett maks ${max} mm`;
    if (h > max) {
      return [
        fail(
          "R04_COOLER_HEIGHT",
          "ERROR",
          ids,
          `Kjøleren er ${fmtCm(h - max)} for høy til at sidepanelet kan lukkes.`,
          tech,
          { action: "REPLACE", category: "COOLER" },
        ),
      ];
    }
    return [ok("R04_COOLER_HEIGHT", "ERROR", ids, "Kjøleren får plass i kabinettet.", tech)];
  },
};
