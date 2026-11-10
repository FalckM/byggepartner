// DP2, US-04, RESP-02 — R11: PSU must have the power cables the graphics card needs.
// A 12V-2x6 card can use the adapter bundled with the card if the PSU has enough 8-pin cables (WARNING).
import { fail, ok, type Rule } from "./helpers";

/** 8-pin cables needed to feed a 12V-2x6 adapter: one per 150 W, at least 2. */
export function adapterPinsNeeded(tbpW: number): number {
  return Math.max(2, Math.ceil(tbpW / 150));
}

export const r11PsuConnectors: Rule = {
  id: "R11_PSU_CONNECTORS",
  title: "Strømforsyningen har riktige kabler til skjermkortet",
  check: ({ psu, gpus }) => {
    if (!psu || gpus.length === 0) return [];
    const need8 = gpus.reduce((s, g) => s + g.specs.powerConnectors.pcie8pin, 0);
    const need16 = gpus.reduce((s, g) => s + g.specs.powerConnectors.pin16_12v2x6, 0);
    const has8 = psu.specs.connectors.pcie8pin;
    const has16 = psu.specs.connectors.pin16_12v2x6;
    const ids = [psu.id, ...new Set(gpus.map((g) => g.id))];
    const tech = `GPU trenger ${need8}×8-pin + ${need16}×12V-2x6; PSU har ${has8}×8-pin + ${has16}×12V-2x6`;

    const missing16 = Math.max(0, need16 - has16);
    const adapterPins = gpus
      .filter((g) => g.specs.powerConnectors.pin16_12v2x6 > 0)
      .slice(need16 - missing16)
      .reduce((s, g) => s + adapterPinsNeeded(g.specs.tbpW), 0);
    const total8 = need8 + (missing16 > 0 ? adapterPins : 0);

    if (has8 < total8) {
      return [
        fail(
          "R11_PSU_CONNECTORS",
          "ERROR",
          ids,
          "Strømforsyningen mangler riktig kabel til skjermkortet.",
          `${tech}; trenger totalt ${total8}×8-pin`,
          { action: "REPLACE", category: "PSU" },
        ),
      ];
    }
    if (missing16 > 0) {
      return [
        fail(
          "R11_PSU_CONNECTORS",
          "WARNING",
          ids,
          "Skjermkortet kobles til med overgangen som følger med kortet. Det virker, men en nyere strømforsyning gir ryddigere kabler.",
          `${tech}; adapter bruker ${adapterPins}×8-pin`,
          { action: "REPLACE", category: "PSU" },
        ),
      ];
    }
    return [ok("R11_PSU_CONNECTORS", "ERROR", ids, "Strømforsyningen har riktige kabler til skjermkortet.", tech)];
  },
};
