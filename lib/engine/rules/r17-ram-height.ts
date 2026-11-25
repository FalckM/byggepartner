// DP2, US-04 — R17: tall RAM can collide with a large air cooler that overhangs the RAM slots.
import { fail, ok, type Rule } from "./helpers";

export const RAM_TALL_MM = 40;

export const r17RamHeight: Rule = {
  id: "R17_RAM_HEIGHT",
  title: "Minnet kommer ikke i veien for kjøleren",
  check: ({ cooler, rams }) => {
    if (!cooler || cooler.specs.type !== "AIR" || rams.length === 0) return [];
    const tall = [...new Set(rams)].filter((r) => r.specs.heightMm > RAM_TALL_MM);
    const ids = [cooler.id, ...new Set(rams.map((r) => r.id))];
    if (cooler.specs.overhangsRam && tall.length > 0) {
      return [
        fail(
          "R17_RAM_HEIGHT",
          "WARNING",
          ids,
          "Minnebrikkene er høye og kan komme i veien for den store kjøleren. Viften må kanskje flyttes litt opp.",
          `RAM ${tall.map((r) => r.specs.heightMm).join("/")} mm > ${RAM_TALL_MM} mm, kjøler overlapper RAM-spor`,
          { action: "REPLACE", category: "RAM" },
        ),
      ];
    }
    return [ok("R17_RAM_HEIGHT", "WARNING", ids, "Minnet kommer ikke i veien for kjøleren.", "Ingen RAM/kjøler-konflikt")];
  },
};
