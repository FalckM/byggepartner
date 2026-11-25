// DP1, US-08 — Plain Norwegian explanations: "Hva gjør denne? Hvorfor valgte vi den?"
// Pure TS. Phase 3 (generator) passes richer context; everything works without it too.
import { joinNb } from "./format";
import type { PowerReport, RuleId } from "./report";
import type { Component, NeedsProfile } from "./types";

/** Words that must not appear unexplained in standard mode (acceptance criteria, spec 13). */
export const JARGON_TERMS = ["sokkel", "pcie", "tdp", "chipset"] as const;

/** Returns the jargon terms found in `text` (case-insensitive, whole words). */
export function findJargon(text: string): string[] {
  const lower = text.toLowerCase();
  return JARGON_TERMS.filter((t) => new RegExp(`(^|[^a-zæøå])${t}([^a-zæøå]|$)`).test(lower));
}

export interface ExplainContext {
  needs?: NeedsProfile;
  /** Display names of the customer's chosen games. */
  gameNames?: string[];
  power?: PowerReport;
}

/** One or two sentences: why this part was chosen for this customer. */
export function explainComponent(c: Component, ctx: ExplainContext = {}): string {
  const n = ctx.needs;
  const games = ctx.gameNames?.length ? joinNb(ctx.gameNames.slice(0, 3)) : undefined;
  const has = (u: NeedsProfile["uses"][number]) => n?.uses.includes(u) ?? false;

  switch (c.category) {
    case "GPU": {
      if (n?.resolution === "1440p" || n?.resolution === "2160p") {
        return `Vi brukte mer av budsjettet på skjermkortet fordi du spiller i ${n.resolution === "2160p" ? "4K" : "1440p"} – skarpere bilde krever mer grafikkraft.`;
      }
      if (games) return `Skjermkortet avgjør hvor jevnt ${games} går. Dette gir god bildefrekvens på skjermen din.`;
      return `Skjermkortet lager bildet i spill. ${c.specs.vramGb} GB grafikkminne gjør at det holder i flere år.`;
    }
    case "CPU": {
      if (n && n.targetHz >= 144 && games) {
        return `I spill som ${games} er det prosessoren som avgjør hvor mange bilder i sekundet du får – viktig for en ${n.targetHz} Hz-skjerm.`;
      }
      if (has("VIDEO_EDIT") || has("3D") || has("STREAMING") || has("PROGRAMMING")) {
        return `${c.specs.cores} kjerner gjør at redigering, streaming og programmering går raskt, også når du gjør flere ting samtidig.`;
      }
      if (n?.longevityYears === 5 && (c.specs.socket === "AM5" || c.specs.socket === "LGA1851")) {
        return "Prosessoren sitter på den nyeste plattformen, så du kan bytte til en raskere prosessor senere uten å bytte hovedkort.";
      }
      return `${c.specs.cores} kjerner er rikelig til spill, skolearbeid og nettlesing.${c.specs.includesCooler ? " Kjøler følger med." : ""}`;
    }
    case "MOTHERBOARD": {
      const bits = ["Hovedkortet er valgt fordi det passer prosessoren og minnet"];
      if (n?.preferences.wifi && c.specs.hasWifi) bits.push("og har trådløst nett innebygd, slik du ønsket");
      else if (c.specs.hasWifi) bits.push("og har trådløst nett innebygd");
      return `${bits.join(" ")}.`;
    }
    case "RAM": {
      const gb = c.specs.capacityGbTotal;
      if (gb >= 64) return `${gb} GB minne gir god plass til store video- og 3D-prosjekter.`;
      if (gb >= 32) return `${gb} GB minne er nok til spill, Discord og mange nettleserfaner samtidig – i mange år.`;
      return `${gb} GB minne holder til spill og skole i dag, og kan utvides senere.`;
    }
    case "STORAGE": {
      const tb = c.specs.capacityGb / 1000;
      const gamesFit = Math.max(1, Math.floor(c.specs.capacityGb / 100));
      if (c.specs.type === "HDD") return `Billig ekstraplass (${tb} TB) til bilder, video og backup.`;
      return `Rask lagring gjør at PC-en og spillene starter på sekunder. ${tb >= 1 ? `${tb} TB` : `${c.specs.capacityGb} GB`} rommer ca. ${gamesFit} store spill.`;
    }
    case "PSU": {
      const p = ctx.power;
      if (p && p.psuW && p.marginPct !== null) {
        return `PC-en bruker ca. ${p.lastW} W. Denne strømforsyningen gir ${p.psuW} W – ${p.marginPct} % margin, så den er stabil og tåler en oppgradering senere.`;
      }
      return `Gir ${c.specs.wattage} W strøm til alle delene, med god margin.`;
    }
    case "CASE": {
      if (n?.preferences.small && c.specs.formFactorClass !== "MID_TOWER") return "Et kompakt kabinett som tar lite plass, slik du ønsket – og alle delene får plass.";
      if (n?.preferences.whiteBuild && c.specs.color === "WHITE") return "Hvitt kabinett, slik du ønsket. Alle delene får god plass.";
      return `Alle delene får god plass, og ${c.specs.includedFans > 0 ? `${c.specs.includedFans} vifter følger med for god kjøling.` : "det er plass til ekstra vifter."}`;
    }
    case "COOLER": {
      if (n?.preferences.quiet) return "Valgt fordi den er stillegående, slik du ønsket – og kraftig nok for prosessoren.";
      return "Holder prosessoren kald, så PC-en er stille og rask også når den jobber hardt.";
    }
    case "OS":
      return "Windows trengs for å starte PC-en og spille. Lisensen er digital og aktiveres automatisk.";
    case "ACCESSORY":
      switch (c.specs.kind) {
        case "THERMAL_PASTE":
          return "Kjøleren leveres uten kjølepasta, så vi la den til – ellers blir prosessoren for varm.";
        case "WIFI_ADAPTER":
          return "Hovedkortet har ikke trådløst nett, så vi la til en adapter slik at du kan bruke Wi-Fi.";
        case "ASSEMBLY_SERVICE":
          return "Vi bygger og tester PC-en for deg, så du slipper å montere selv.";
        default:
          return c.plainSummary;
      }
  }
}

/** Plain explanation of WHY each rule matters – used in "Vi har sjekket …" list and compatibility map (US-21). */
export const RULE_EXPLANATION: Record<RuleId, string> = {
  R00_UNKNOWN_COMPONENT: "Vi sjekker at alle delene fortsatt finnes i katalogen.",
  R01_SOCKET: "Prosessoren må ha samme type feste som hovedkortet, ellers kan den ikke settes i.",
  R02_MEMORY_TYPE: "Det finnes to typer minne som ikke passer i hverandres spor. Minne, hovedkort og prosessor må bruke samme type.",
  R03_GPU_LENGTH: "Skjermkort kan være over 30 cm lange. Vi sjekker at kortet får plass i kabinettet.",
  R04_COOLER_HEIGHT: "Høye kjølere kan hindre at sidepanelet lukkes. Vi sammenligner høyden med kabinettet.",
  R05_COOLER_SOCKET: "Kjøleren må ha riktig feste for prosessoren.",
  R06_COOLER_CAPACITY: "Kjøleren må tåle varmen prosessoren lager, ellers blir PC-en varm og bråkete.",
  R07_RADIATOR_FIT: "En vannkjøler har en radiator som må ha et monteringssted i kabinettet.",
  R08_FORM_FACTOR: "Hovedkort finnes i flere størrelser. Kabinettet må ha plass til størrelsen du har valgt.",
  R09_PSU_FORM: "Små kabinetter trenger en mini-strømforsyning. Vi sjekker format og lengde.",
  R10_PSU_WATTAGE: "Vi regner ut hvor mye strøm PC-en bruker, og sjekker at strømforsyningen har god margin.",
  R11_PSU_CONNECTORS: "Kraftige skjermkort trenger egne strømkabler. Vi sjekker at strømforsyningen har dem.",
  R12_RAM_SLOTS: "Hovedkortet har et begrenset antall plasser til minnebrikker.",
  R13_M2_SLOTS: "Raske lagringsbrikker skrus rett på hovedkortet, som har et begrenset antall plasser.",
  R14_SATA: "Disker med kabel trenger tilkobling på hovedkortet, strømkabel og plass i kabinettet.",
  R15_DISPLAY_OUTPUT: "Uten skjermkort må prosessoren ha innebygd grafikk for at du skal få bilde.",
  R16_BIOS: "Eldre hovedkort kan trenge en oppdatering av programvaren på kortet for å kjenne igjen nye prosessorer.",
  R17_RAM_HEIGHT: "Høye minnebrikker med lys kan kollidere med store kjølere.",
  R18_THERMAL_PASTE: "Kjølepasta trengs mellom prosessor og kjøler. Noen kjølere har den ferdig påført.",
  R19_DUPLICATE_SINGLETON: "En PC har bare én prosessor, ett hovedkort, ett kabinett og én strømforsyning.",
};
