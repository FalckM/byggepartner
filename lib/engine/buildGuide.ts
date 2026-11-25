// US-20 — Personal build guide generated from the actual parts (plain Norwegian, no jargon).
import { buildContext } from "./context";
import type { BuildItems, Catalog } from "./types";

export interface GuideStep {
  title: string;
  body: string;
  /** Extra caution (e.g. fragile CPU pins). */
  careful?: boolean;
}

export function buildGuide(items: BuildItems, catalog: Catalog): GuideStep[] {
  const ctx = buildContext(items, catalog);
  const { cpu, mb, cooler, psu, pcCase } = ctx;
  const gpu = ctx.gpus[0];
  const nvme = ctx.storage.filter((s) => s.specs.type === "NVME");
  const sata = ctx.storage.filter((s) => s.specs.interface === "SATA");
  const steps: GuideStep[] = [];
  const assembled = ctx.accessories.some((a) => a.specs.kind === "ASSEMBLY_SERVICE");

  steps.push({
    title: "Gjør klar arbeidsplassen",
    body: "Bygg på et bord uten teppe under. Ta på et metallrør eller radiatoren før du starter, så du ikke overfører statisk strøm til delene. Legg hovedkortet på esken det kom i.",
  });

  if (cpu && mb) {
    const pinsOnCpu = cpu.specs.socket === "AM4";
    steps.push({
      title: `Sett ${cpu.name} i hovedkortet`,
      body: pinsOnCpu
        ? "Denne prosessoren har små pinner på undersiden – hold den bare i kantene. Løft armen ved festet, sett prosessoren slik at den lille gull-trekanten i hjørnet peker mot trekanten på hovedkortet, og la den falle på plass av seg selv. Ikke press. Senk armen."
        : "Løft metallbøylen ved festet. Sett prosessoren slik at den lille gull-trekanten i hjørnet peker mot trekanten på hovedkortet, og legg den rett ned uten å presse. Senk bøylen – det er normalt at det krever litt kraft, og plastlokket spretter av.",
      careful: true,
    });
  }

  if (ctx.rams.length && mb) {
    const modules = ctx.rams.reduce((s, r) => s + r.specs.modules, 0);
    steps.push({
      title: "Sett inn minnebrikkene",
      body:
        modules === 2 && mb.specs.memorySlots === 4
          ? "Bruk spor nummer 2 og 4 regnet fra prosessoren (ofte merket A2 og B2). Åpne klipsene, sett brikken rett ned med hakket på riktig side, og trykk til begge klipsene smekker igjen."
          : "Fyll alle sporene. Åpne klipsene, sett brikkene rett ned med hakket på riktig side, og trykk til klipsene smekker igjen.",
    });
  }

  if (nvme.length && mb) {
    steps.push({
      title: "Skru i lagringsbrikken",
      body: `Hovedkortet ditt har ${mb.specs.m2Slots} plass${mb.specs.m2Slots === 1 ? "" : "er"} til lagringsbrikker. Bruk den øverste, nærmest prosessoren – den er raskest. Fjern kjøleplaten over sporet, sett brikken på skrå inn i sporet, trykk den ned og skru den fast.`,
    });
  }

  if (cpu) {
    if (!cooler) {
      steps.push({
        title: "Monter kjøleren som fulgte med prosessoren",
        body: "Kjølepasta er allerede påført under kjøleren – ikke tørk den av. Sett kjøleren rett ned over prosessoren og skru skruene i kryss, litt og litt. Koble kabelen til kontakten merket «CPU_FAN».",
      });
    } else {
      const paste = cooler.specs.includesThermalPaste
        ? "Kjølepasta er allerede påført – fjern bare beskyttelsesfilmen."
        : "Legg en klatt kjølepasta på størrelse med en ert midt på prosessoren. Den sprer seg når kjøleren skrus fast.";
      const where =
        cooler.specs.type === "AIO"
          ? ` Radiatoren (${cooler.specs.radiatorMm} mm) monteres ${pcCase?.specs.radiatorSupport.top.includes(cooler.specs.radiatorMm as never) ? "i taket" : "foran"} i kabinettet, med slangene nederst om mulig.`
          : "";
      steps.push({
        title: `Monter ${cooler.name}`,
        body: `Fest monteringsbraketten som passer prosessoren din (se manualen). ${paste} Skru kjøleren fast i kryss, litt og litt. Koble viftekabelen til «CPU_FAN».${where}`,
      });
    }
  }

  if (pcCase && mb) {
    steps.push({
      title: `Sett hovedkortet i ${pcCase.name}`,
      body: "Sjekk at de små avstandsskruene i kabinettet står der hullene i hovedkortet er. Sett hovedkortet på plass med kontaktene mot åpningen bak, og skru det fast.",
    });
  }

  if (psu) {
    steps.push({
      title: "Monter strømforsyningen",
      body: "Viften skal vanligvis peke ned hvis kabinettet har luftinntak i bunnen. Koble den store 24-pinners kabelen til hovedkortet og 8-pinners kabelen øverst til venstre (strøm til prosessoren).",
    });
  }

  if (gpu) {
    const pc = gpu.specs.powerConnectors;
    const cable =
      pc.pin16_12v2x6 > 0
        ? psu && psu.specs.connectors.pin16_12v2x6 > 0
          ? "Bruk den flate 12V-2x6-kabelen fra strømforsyningen og skyv den helt inn til den klikker – det skal ikke være noen glipe."
          : "Bruk overgangen som fulgte med skjermkortet, og skyv den helt inn til den klikker."
        : `Koble til ${pc.pcie8pin} stk. 8-pinners strømkabel${pc.pcie8pin > 1 ? "er" : ""} merket for skjermkort.`;
    steps.push({
      title: `Sett inn ${gpu.name}`,
      body: `Fjern de to platene bak på kabinettet der kortet skal stå. Sett kortet i det øverste lange sporet til det klikker, og skru det fast. ${cable}`,
    });
  }

  if (sata.length) {
    steps.push({
      title: "Koble til diskene med kabel",
      body: `${sata.length} disk${sata.length > 1 ? "er" : ""} skrus fast i diskbrønnene. Koble en datakabel til hovedkortet og en strømkabel fra strømforsyningen til hver disk.`,
    });
  }

  if (cpu && mb && !mb.specs.shipsWithBiosSupportFor.includes(cpu.specs.generation)) {
    steps.push({
      title: "Oppdater programvaren på hovedkortet først",
      body: mb.specs.biosFlashback
        ? "Last ned siste BIOS fra produsentens nettside til en USB-pinne, sett den i porten merket «Flashback» og hold knappen inne til lyset blinker. Det tar ca. 5 minutter – ingen prosessor trengs."
        : "Hovedkortet kan trenge en oppdatering før prosessoren virker. Velg montering, så gjør vi dette gratis for deg.",
      careful: true,
    });
  }

  steps.push({
    title: "Første oppstart",
    body: `${gpu ? "Koble skjermen til skjermkortet – ikke til hovedkortet." : "Koble skjermen til hovedkortet bak på PC-en."} Trykk på startknappen. Det er normalt at første oppstart tar opptil ett minutt mens minnet testes.`,
  });

  if (ctx.oses.length) {
    steps.push({
      title: "Installer Windows",
      body: "Lag en installasjons-USB med Microsofts verktøy, start fra den, og følg veiviseren. Lisensnøkkelen finner du i ordrebekreftelsen.",
    });
  }

  if (assembled) {
    steps.unshift({
      title: "Du har valgt montering",
      body: "Vi bygger, oppdaterer og tester PC-en for deg. Guiden under viser hva vi gjør – fint hvis du er nysgjerrig eller vil bygge selv neste gang.",
    });
  }
  return steps;
}
