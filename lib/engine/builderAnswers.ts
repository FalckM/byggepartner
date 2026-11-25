// US-19, RESP-07 (ESCALATE) — «Spør en PC-bygger»: simulated, prewritten answers based on THIS build.
import { buildContext } from "./context";
import { joinNb } from "./format";
import type { ValidationReport } from "./report";
import type { BuildItems, Catalog, NeedsProfile } from "./types";

export interface CannedQuestion {
  id: string;
  question: string;
  answer: string;
}

export function builderAnswers(items: BuildItems, catalog: Catalog, report: ValidationReport, needs?: NeedsProfile): CannedQuestion[] {
  const ctx = buildContext(items, catalog);
  const { cpu, mb, psu, cooler } = ctx;
  const gpu = ctx.gpus[0];
  const out: CannedQuestion[] = [];

  out.push({
    id: "fits",
    question: "Passer alt sammen?",
    answer: report.ok
      ? `Ja. Vi har sjekket blant annet at ${cpu ? "prosessoren passer i hovedkortet" : "delene passer"}, at skjermkortet får plass i kabinettet og at strømforsyningen har nok kraft. Skulle noe likevel ikke passe, bytter vi det kostnadsfritt.`
      : `Ikke helt ennå: ${report.results.filter((r) => !r.passed && r.severity === "ERROR").map((r) => r.messagePlain.toLowerCase().replace(/\.$/, "")).slice(0, 2).join(", og ") || "noe mangler i sjekklisten"}. Bruk knappene i handlekurven, så fikser vi det med ett klikk.`,
  });

  if (gpu && needs?.games.length) {
    out.push({
      id: "games",
      question: `Holder dette til ${needs.games.length === 1 ? "spillet" : "spillene"} mine?`,
      answer: `${gpu.name} er valgt med tanke på ${needs.resolution === "2160p" ? "4K" : needs.resolution} og ${needs.targetHz} Hz. Se «Estimert ytelse» for tall per spill – de er anslag, men gir et godt bilde av hva du kan forvente.`,
    });
  }

  out.push({
    id: "paste",
    question: "Trenger jeg kjølepasta?",
    answer: !cooler
      ? "Nei. Kjøleren som følger med prosessoren har pasta ferdig påført."
      : cooler.specs.includesThermalPaste
        ? `Nei. ${cooler.name} har pasta ferdig påført.`
        : `Ja – ${cooler.name} leveres uten. ${ctx.accessories.some((a) => a.specs.kind === "THERMAL_PASTE") ? "Den ligger allerede i pakken din." : "Legg til en tube fra sjekklisten."}`,
  });

  if (psu) {
    const p = report.power;
    out.push({
      id: "upgrade",
      question: "Kan jeg oppgradere senere?",
      answer: `${p.marginPct !== null && p.marginPct >= 50 ? `Strømforsyningen har ${p.marginPct} % margin, så et kraftigere skjermkort går fint senere.` : "Strømforsyningen har litt margin, men et mye kraftigere skjermkort kan kreve en større."} ${
        cpu && (cpu.specs.socket === "AM5" || cpu.specs.socket === "LGA1851")
          ? "Prosessoren sitter på den nyeste plattformen, så du kan også bytte til en raskere prosessor senere."
          : "Vil du bytte prosessor om noen år, må du trolig bytte hovedkort også."
      }`,
    });
  }

  out.push({
    id: "assembly",
    question: "Jeg er redd for å ødelegge noe når jeg bygger",
    answer: `Det er helt vanlig! Det ømfintligste er prosessoren${cpu?.specs.socket === "AM4" ? ", som har små pinner under" : ""}. Du får en personlig byggeguide etter kjøpet, men vil du være helt trygg kan du velge montering for 999 kr – da bygger og tester vi PC-en for deg${mb && cpu && !mb.specs.shipsWithBiosSupportFor.includes(cpu.specs.generation) ? ", og oppdaterer programvaren på hovedkortet" : ""}.`,
  });

  const owned = items.filter((i) => i.owned);
  if (owned.length) {
    out.push({
      id: "owned",
      question: "Passer de nye delene med det jeg har?",
      answer: `Ja – vi har sjekket de nye delene mot ${joinNb(owned.map((o) => catalog.find((c) => c.id === o.componentId)?.name ?? "delene dine"))}.`,
    });
  }
  return out;
}
