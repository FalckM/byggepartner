// DP2, US-04 — R16: motherboard may need a BIOS update for this CPU generation.
// WARNING normally; INFO when the board can update itself without a CPU (BIOS Flashback).
import { fail, ok, type Rule } from "./helpers";

export const r16Bios: Rule = {
  id: "R16_BIOS",
  title: "Hovedkortet kjenner igjen prosessoren",
  check: ({ cpu, mb }) => {
    // Socket mismatch is R01's job – BIOS support is meaningless then.
    if (!cpu || !mb || cpu.specs.socket !== mb.specs.socket) return [];
    const ids = [cpu.id, mb.id];
    const supported = mb.specs.shipsWithBiosSupportFor;
    const tech = `CPU-generasjon ${cpu.specs.generation}; BIOS fra fabrikk støtter ${supported.join(", ")}; Flashback: ${mb.specs.biosFlashback ? "ja" : "nei"}`;
    if (supported.includes(cpu.specs.generation)) {
      return [ok("R16_BIOS", "WARNING", ids, "Hovedkortet støtter prosessoren rett ut av esken.", tech)];
    }
    if (mb.specs.biosFlashback) {
      return [
        fail(
          "R16_BIOS",
          "INFO",
          ids,
          "Hovedkortet trenger en programvareoppdatering, men den kan gjøres med ett knappetrykk. Multicom gjør dette gratis ved montering.",
          tech,
        ),
      ];
    }
    return [
      fail(
        "R16_BIOS",
        "WARNING",
        ids,
        "Hovedkortet kan trenge en BIOS-oppdatering (programvaren på kortet) før prosessoren virker. Multicom gjør dette gratis ved montering.",
        tech,
        { action: "REPLACE", category: "MOTHERBOARD" },
      ),
    ];
  },
};
