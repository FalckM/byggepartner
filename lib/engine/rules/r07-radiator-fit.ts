// DP2, US-04 — R07: water-cooler radiator must have a mounting spot in the case.
import { fail, ok, type Rule } from "./helpers";

export const r07RadiatorFit: Rule = {
  id: "R07_RADIATOR_FIT",
  title: "Vannkjølerens radiator får plass",
  check: ({ cooler, pcCase }) => {
    if (!cooler || !pcCase || cooler.specs.type !== "AIO" || cooler.specs.radiatorMm === undefined) return [];
    const size = cooler.specs.radiatorMm;
    const { top, front } = pcCase.specs.radiatorSupport;
    const ids = [cooler.id, pcCase.id];
    const tech = `Radiator ${size} mm; kabinett topp [${top.join(", ")}], front [${front.join(", ")}]`;
    if (!top.includes(size) && !front.includes(size)) {
      return [
        fail(
          "R07_RADIATOR_FIT",
          "ERROR",
          ids,
          "Vannkjøleren er for stor – kabinettet har ikke plass til radiatoren.",
          tech,
          { action: "REPLACE", category: "COOLER" },
        ),
      ];
    }
    return [ok("R07_RADIATOR_FIT", "ERROR", ids, "Vannkjølerens radiator får plass i kabinettet.", tech)];
  },
};
