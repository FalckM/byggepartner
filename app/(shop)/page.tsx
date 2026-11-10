import Link from "next/link";
import { ArrowRight, PackageCheck, ShieldCheck, Wrench, Workflow } from "lucide-react";

// DP1, DP4 — Landing page (spec 9.3): two entries, three trust points.
export default function Home() {
  return (
    <main>
      <section className="relative overflow-hidden border-b bg-blueprint">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.2fr_1fr] md:py-20">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm">
              <Workflow aria-hidden className="size-4 text-primary" /> Din digitale byggepartner
            </p>
            <h1 className="text-4xl leading-[1.05] font-semibold text-balance sm:text-5xl md:text-6xl">
              Få en PC som passer – uten å kunne alt om PC-deler.
            </h1>
            <p className="max-w-prose text-lg text-muted-foreground">
              Fortell oss budsjettet og hva du skal bruke PC-en til. Vi setter sammen en komplett maskin der vi har sjekket at
              alt passer – før du betaler.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/veiviser"
                className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground shadow-sm transition hover:shadow-md"
              >
                Hjelp meg å velge <ArrowRight aria-hidden className="size-5 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/bygg"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border bg-card px-6 text-base font-medium hover:border-primary"
              >
                Jeg vil bygge selv
              </Link>
            </div>
          </div>
          <StampIllustration />
        </div>
      </section>

      <section aria-labelledby="trust" className="mx-auto max-w-6xl px-4 py-14">
        <h2 id="trust" className="sr-only">
          Derfor kan du være trygg
        </h2>
        <ul className="grid gap-4 md:grid-cols-3">
          <Trust icon={<ShieldCheck className="size-6" />} title="Alt sjekkes automatisk">
            Vi sjekker at delene passer fysisk, har nok strøm og riktige kabler. Du kan ikke velge noe som ikke passer.
          </Trust>
          <Trust icon={<PackageCheck className="size-6" />} title="Ingenting mangler">
            Kjøler, Windows og kjølepasta kommer med når du trenger dem – ingen ubehagelige overraskelser.
          </Trust>
          <Trust icon={<Wrench className="size-6" />} title="Kompatibilitetsgaranti">
            Passer delene i pakken ikke sammen, bytter vi dem kostnadsfritt. Vil du heller slippe å bygge, monterer vi den.
          </Trust>
        </ul>
      </section>
    </main>
  );
}

function Trust({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <li className="rounded-2xl border bg-card p-6">
      <span aria-hidden className="grid size-11 place-items-center rounded-xl bg-secondary text-secondary-foreground">
        {icon}
      </span>
      <h3 className="mt-4 text-xl font-semibold">{title}</h3>
      <p className="mt-1 text-muted-foreground">{children}</p>
    </li>
  );
}

/** Decorative: a packing slip with the green stamp – the product promise in one picture. */
function StampIllustration() {
  const rows = [
    ["Prosessor", "6 kjerner"],
    ["Skjermkort", "16 GB"],
    ["Minne", "32 GB"],
    ["Lagring", "1 TB"],
    ["Strøm", "650 W"],
  ];
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-sm self-center">
      <div className="rotate-[-2deg] rounded-2xl border bg-card p-6 shadow-[0_20px_50px_-20px_oklch(0.3_0.08_258/0.35)]">
        <p className="font-heading text-sm font-semibold tracking-wide text-muted-foreground uppercase">Din pakke · 13 990 kr</p>
        <ul className="mt-4 space-y-2.5 text-sm">
          {rows.map(([a, b]) => (
            <li key={a} className="flex items-center justify-between border-b border-dashed pb-2">
              <span>{a}</span>
              <span className="font-medium">{b}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="absolute -right-3 -bottom-6 rotate-[8deg] rounded-xl border-[3px] border-ok bg-card/95 px-4 py-2 text-center shadow-sm sm:-right-6">
        <p className="font-heading text-lg leading-tight font-bold text-ok">ALT PASSER</p>
        <p className="font-heading text-xs font-semibold tracking-[0.2em] text-ok">SAMMEN ✓</p>
      </div>
    </div>
  );
}
