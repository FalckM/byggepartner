// DP2, US-04 — R08: motherboard size must be supported by the case.
import { fail, ok, type Rule } from "./helpers";

export const r08FormFactor: Rule = {
  id: "R08_FORM_FACTOR",
  title: "Hovedkortet får plass i kabinettet",
  check: ({ mb, pcCase }) => {
    if (!mb || !pcCase) return [];
    const ids = [mb.id, pcCase.id];
    const tech = `Hovedkort ${mb.specs.formFactor}; kabinett støtter ${pcCase.specs.supportedMotherboards.join("/")}`;
    if (!pcCase.specs.supportedMotherboards.includes(mb.specs.formFactor)) {
      return [
        fail(
          "R08_FORM_FACTOR",
          "ERROR",
          ids,
          "Hovedkortet er for stort for kabinettet.",
          tech,
          { action: "REPLACE", category: "CASE" },
        ),
      ];
    }
    return [ok("R08_FORM_FACTOR", "ERROR", ids, "Hovedkortet får plass i kabinettet.", tech)];
  },
};
