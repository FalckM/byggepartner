// DP3, RESP-06 — R18: a new cooler without pre-applied paste needs thermal paste in the build.
import { fail, ok, type Rule } from "./helpers";

export const r18ThermalPaste: Rule = {
  id: "R18_THERMAL_PASTE",
  title: "Kjølepasta er med",
  check: ({ cooler, accessories, catalog }) => {
    if (!cooler) return [];
    if (cooler.specs.includesThermalPaste) {
      return [ok("R18_THERMAL_PASTE", "INFO", [cooler.id], "Kjølepasta følger med kjøleren.", "Pasta forhåndspåført")];
    }
    const paste = accessories.find((a) => a.specs.kind === "THERMAL_PASTE");
    if (paste) {
      return [ok("R18_THERMAL_PASTE", "INFO", [cooler.id, paste.id], "Kjølepasta er lagt til.", "Separat pasta i pakken")];
    }
    return [
      fail(
        "R18_THERMAL_PASTE",
        "INFO",
        [cooler.id],
        "Kjøleren leveres uten kjølepasta – du trenger en liten tube.",
        "Kjøler uten pasta, ingen THERMAL_PASTE i build",
        {
          action: "ADD",
          category: "ACCESSORY",
          candidateIds: catalog
            .filter((c) => c.category === "ACCESSORY" && c.specs.kind === "THERMAL_PASTE" && c.stock !== "OUT")
            .sort((a, b) => a.priceNok - b.priceNok)
            .map((c) => c.id),
        },
      ),
    ];
  },
};
