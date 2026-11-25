// DP2, US-04 — R09: PSU format (ATX/SFX) and length must fit the case.
import { fail, ok, type Rule } from "./helpers";

export const r09PsuForm: Rule = {
  id: "R09_PSU_FORM",
  title: "Strømforsyningen får plass i kabinettet",
  check: ({ psu, pcCase }) => {
    if (!psu || !pcCase) return [];
    const ids = [psu.id, pcCase.id];
    const { formFactor, lengthMm } = psu.specs;
    const { supportedPsu, maxPsuLengthMm } = pcCase.specs;
    const tech = `PSU ${formFactor} ${lengthMm} mm; kabinett ${supportedPsu.join("/")} maks ${maxPsuLengthMm} mm`;
    if (!supportedPsu.includes(formFactor)) {
      return [
        fail(
          "R09_PSU_FORM",
          "ERROR",
          ids,
          formFactor === "ATX"
            ? "Strømforsyningen er for stor – dette lille kabinettet trenger en mini-strømforsyning."
            : "Denne mini-strømforsyningen passer ikke i kabinettet uten ekstra brakett.",
          tech,
          { action: "REPLACE", category: "PSU" },
        ),
      ];
    }
    if (lengthMm > maxPsuLengthMm) {
      return [
        fail(
          "R09_PSU_FORM",
          "ERROR",
          ids,
          "Strømforsyningen er for lang for kabinettet.",
          tech,
          { action: "REPLACE", category: "PSU" },
        ),
      ];
    }
    return [ok("R09_PSU_FORM", "ERROR", ids, "Strømforsyningen får plass i kabinettet.", tech)];
  },
};
