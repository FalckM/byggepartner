// DP2, US-04 — R06: cooler must handle the CPU's heat (WARNING below 1.2× headroom).
import { fail, ok, type Rule } from "./helpers";

export const COOLER_HEADROOM = 1.2;

export const r06CoolerCapacity: Rule = {
  id: "R06_COOLER_CAPACITY",
  title: "Kjøleren er sterk nok",
  check: ({ cooler, cpu }) => {
    if (!cooler || !cpu) return [];
    const rating = cooler.specs.tdpRatingW;
    const tdp = cpu.specs.tdpW;
    const ids = [cooler.id, cpu.id];
    const tech = `Kjøler ${rating} W, CPU TDP ${tdp} W (${(rating / tdp).toFixed(2)}×)`;
    if (rating < tdp) {
      return [
        fail(
          "R06_COOLER_CAPACITY",
          "ERROR",
          ids,
          "Kjøleren er for svak for prosessoren – PC-en kan bli for varm og trege ned.",
          tech,
          { action: "REPLACE", category: "COOLER" },
        ),
      ];
    }
    if (rating < tdp * COOLER_HEADROOM) {
      return [
        fail(
          "R06_COOLER_CAPACITY",
          "WARNING",
          ids,
          "Kjøleren er litt svak – PC-en kan bli varm og bråkete.",
          tech,
          { action: "REPLACE", category: "COOLER" },
        ),
      ];
    }
    return [ok("R06_COOLER_CAPACITY", "ERROR", ids, "Kjøleren har god kapasitet for prosessoren.", tech)];
  },
};
