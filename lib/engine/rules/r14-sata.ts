// DP2, US-04 — R14: SATA drives need ports on the motherboard, bays in the case and PSU cables.
import { fail, ok, type Rule } from "./helpers";

export const r14Sata: Rule = {
  id: "R14_SATA",
  title: "Diskene kan kobles til og monteres",
  check: ({ mb, pcCase, psu, storage }) => {
    const sata = storage.filter((s) => s.specs.interface === "SATA");
    if (sata.length === 0 || (!mb && !pcCase && !psu)) return [];
    const ssd25 = sata.filter((s) => s.specs.type === "SATA_SSD").length;
    const hdd35 = sata.filter((s) => s.specs.type === "HDD").length;
    const ids = [...new Set(sata.map((s) => s.id))];

    if (mb && sata.length > mb.specs.sataPorts) {
      return [
        fail(
          "R14_SATA",
          "ERROR",
          [mb.id, ...ids],
          `Hovedkortet har bare ${mb.specs.sataPorts} tilkoblinger for disker med kabel.`,
          `${sata.length} SATA-enheter / ${mb.specs.sataPorts} SATA-porter`,
          { action: "REPLACE", category: "MOTHERBOARD" },
        ),
      ];
    }
    if (pcCase) {
      const { driveBays25, driveBays35 } = pcCase.specs;
      // 2.5" SSDs can also use free 3.5" bays.
      const free35 = driveBays35 - hdd35;
      if (hdd35 > driveBays35 || ssd25 > driveBays25 + Math.max(0, free35)) {
        return [
          fail(
            "R14_SATA",
            "ERROR",
            [pcCase.id, ...ids],
            "Kabinettet har ikke nok plass til alle diskene.",
            `${hdd35}× 3,5" / ${driveBays35} brønner, ${ssd25}× 2,5" / ${driveBays25} brønner`,
            { action: "REPLACE", category: "CASE" },
          ),
        ];
      }
    }
    if (psu && sata.length > psu.specs.connectors.sata) {
      return [
        fail(
          "R14_SATA",
          "ERROR",
          [psu.id, ...ids],
          "Strømforsyningen har ikke nok strømkabler til alle diskene.",
          `${sata.length} SATA-enheter / ${psu.specs.connectors.sata} SATA-strømkontakter`,
          { action: "REPLACE", category: "PSU" },
        ),
      ];
    }
    const involved = [...(mb ? [mb.id] : []), ...(pcCase ? [pcCase.id] : []), ...ids];
    return [ok("R14_SATA", "ERROR", involved, "Diskene kan kobles til og monteres.", `${sata.length} SATA-enhet(er) OK`)];
  },
};
