import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AlertTriangle, CheckCircle2, Download, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { computeMetrics, sessionSummaries } from "@/lib/analytics/metrics";
import { cn } from "@/lib/utils";

// US-16, H1–H3 — Measurement dashboard for the Build–Measure–Learn round.
export const metadata: Metadata = { title: "Analyse" };

export default function AnalysisPage({ searchParams }: PageProps<"/admin/analyse">) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Analyse – H1, H2 og H3</h1>
          <p className="text-muted-foreground">Fra anonyme hendelser og testøkter. Ingen IP-adresser eller navn lagres.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {(["summary", "sessions", "events"] as const).map((t) => (
            <a key={t} href={`/api/admin/export?type=${t}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border bg-card px-3 hover:border-primary">
              <Download aria-hidden className="size-4" /> CSV: {t === "summary" ? "testøkter (sammendrag)" : t === "sessions" ? "testøkter (rå)" : "alle hendelser"}
            </a>
          ))}
        </div>
      </div>
      <p className="flex items-start gap-2 rounded-xl border border-warn bg-warn-soft p-3 text-sm" role="note">
        <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
        Små utvalg (5–10 deltakere) gir ikke statistisk signifikans. Bruk tallene som indikasjoner sammen med observasjonene fra testene.
      </p>
      <Suspense fallback={<p className="text-muted-foreground">Regner ut …</p>}>
        <Analysis searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Analysis({ searchParams }: Pick<PageProps<"/admin/analyse">, "searchParams">) {
  await connection();
  const onlyTests = (await searchParams).kilde === "test";
  const [events, sessions] = await Promise.all([
    db.event.findMany({ where: onlyTests ? { sessionId: { not: null } } : undefined, orderBy: { ts: "asc" } }),
    db.testSession.findMany(),
  ]);
  const m = computeMetrics(events, sessions);
  const summaries = sessionSummaries(sessions, events.filter((e) => e.sessionId));
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : "–");
  const finished = sessions.filter((s) => s.finishedAt && s.confidenceScore);
  const avgConf = finished.length ? (finished.reduce((s, x) => s + (x.confidenceScore ?? 0), 0) / finished.length).toFixed(1) : "–";

  return (
    <div className="space-y-8">
      <nav aria-label="Datagrunnlag" className="flex gap-2 text-sm">
        <Link href="/admin/analyse" aria-current={!onlyTests ? "page" : undefined} className={cn("rounded-full border px-3 py-1.5", !onlyTests && "border-primary bg-primary text-primary-foreground")}>
          Alle besøk
        </Link>
        <Link href="/admin/analyse?kilde=test" aria-current={onlyTests ? "page" : undefined} className={cn("rounded-full border px-3 py-1.5", onlyTests && "border-primary bg-primary text-primary-foreground")}>
          Bare testøkter
        </Link>
      </nav>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5" data-testid="kpis">
        <Kpi label="Besøkende / økter" value={String(m.actors)} />
        <Kpi label="H1 · median tid til PC-forslag" value={m.h1.medianTimeToPackageSec === null ? "–" : `${m.h1.medianTimeToPackageSec} s`} sub={`n = ${m.h1.n}`} />
        <Kpi label="H2 · fullført etter grønn hake" value={pct(m.h2.green.completed, m.h2.green.n)} sub={`uten grønn hake: ${pct(m.h2.notGreen.completed, m.h2.notGreen.n)}`} />
        <Kpi label="H3 · komplett pakke i handlekurven" value={pct(m.h3.completeAtLastView, m.h3.withCart)} sub={`${m.h3.checklistFixes} deler lagt til via sjekklisten`} />
        <Kpi label="Trygghet (1–5), snitt" value={avgConf} sub={`${finished.length} svar`} />
      </dl>

      <section aria-labelledby="funnel" className="rounded-xl border bg-card p-4">
        <h2 id="funnel" className="font-semibold">Trakt</h2>
        <ol className="mt-3 space-y-2" data-testid="funnel">
          {m.funnel.map((f) => (
            <Bar key={f.key} label={f.label} value={f.count} max={m.funnel[0].count || 1} suffix={pct(f.count, m.funnel[0].count)} />
          ))}
        </ol>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="h1" className="rounded-xl border bg-card p-4">
          <h2 id="h1" className="font-semibold">H1 · Hvor lenge bruker de på hvert steg? (median)</h2>
          <p className="text-sm text-muted-foreground">Lange steg = der folk nøler.</p>
          <ol className="mt-3 space-y-2">
            {m.h1.steps.length === 0 && <li className="text-sm text-muted-foreground">Ingen data ennå.</li>}
            {m.h1.steps.map((s) => (
              <Bar key={s.step} label={STEP_LABEL[s.step] ?? s.step} value={s.medianSec} max={Math.max(...m.h1.steps.map((x) => x.medianSec), 1)} suffix={`${s.medianSec} s · n=${s.n}`} />
            ))}
          </ol>
        </section>
        <section aria-labelledby="h2" className="rounded-xl border bg-card p-4">
          <h2 id="h2" className="font-semibold">H2 · Grønn hake og fullføring</h2>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="font-normal">I handlekurven</th>
                <th className="text-right font-normal">Personer</th>
                <th className="text-right font-normal">Fullførte</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              <tr>
                <td>Så «Alt passer sammen»</td>
                <td className="text-right">{m.h2.green.n}</td>
                <td className="text-right">{pct(m.h2.green.completed, m.h2.green.n)}</td>
              </tr>
              <tr>
                <td>Så aldri grønn hake</td>
                <td className="text-right">{m.h2.notGreen.n}</td>
                <td className="text-right">{pct(m.h2.notGreen.completed, m.h2.notGreen.n)}</td>
              </tr>
            </tbody>
          </table>
          <h3 className="mt-5 font-semibold">Nøling og hjelp</h3>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm tabular-nums">
            <li>Feilmeldinger vist: {m.hesitation.validationErrors}</li>
            <li>«Hvorfor denne?» åpnet: {m.hesitation.explanations}</li>
            <li>Bytt-skuff åpnet: {m.hesitation.swapsOpened}</li>
            <li>Deler byttet: {m.hesitation.swaps}</li>
            <li>«Spør en PC-bygger»: {m.hesitation.askBuilder}</li>
            <li>Mest vanlige feil: {m.hesitation.topErrorRules.map((r) => `${r.rule} (${r.count})`).join(", ") || "–"}</li>
          </ul>
        </section>
      </div>

      <section aria-labelledby="segments" className="rounded-xl border bg-card p-4">
        <h2 id="segments" className="font-semibold">Per segment (avsluttede testøkter)</h2>
        <div className="mt-3 overflow-x-auto" tabIndex={0} role="region" aria-label="Tabell per segment">
          <table className="w-full text-sm [&_td]:px-2 [&_th]:px-2">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-1 font-normal">Segment</th>
                <th className="text-right font-normal">Økter</th>
                <th className="text-right font-normal">Fullført</th>
                <th className="text-right font-normal">Median tid</th>
                <th className="text-right font-normal">Trygghet</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {m.segments.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-3 text-muted-foreground">
                    Ingen avsluttede testøkter ennå. <Link href="/test" className="underline">Start en</Link>.
                  </td>
                </tr>
              )}
              {m.segments.map((s) => (
                <tr key={s.segment} className="border-t">
                  <td className="py-1.5">{s.segment}</td>
                  <td className="text-right">{s.n}</td>
                  <td className="text-right">{pct(s.completed, s.n)}</td>
                  <td className="text-right">{s.medianDurationSec === null ? "–" : `${Math.round(s.medianDurationSec)} s`}</td>
                  <td className="text-right">{s.avgConfidence ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="sessions" className="rounded-xl border bg-card p-4">
        <h2 id="sessions" className="font-semibold">Testøkter</h2>
        <div className="mt-3 overflow-x-auto" tabIndex={0} role="region" aria-label="Tabell over testøkter">
          <table className="w-full text-sm [&_td]:px-2 [&_th]:px-2" data-testid="sessions-table">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-1 font-normal">Kode</th>
                <th className="font-normal">Segment</th>
                <th className="text-right font-normal">Varighet</th>
                <th className="text-right font-normal">Til forslag</th>
                <th className="font-normal">Grønn hake</th>
                <th className="font-normal">Fullført</th>
                <th className="text-right font-normal">Feil</th>
                <th className="text-right font-normal">Trygghet</th>
                <th className="font-normal">Notat</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {summaries.map((s, i) => (
                <tr key={i} className="border-t" data-testid="session-row" data-code={s.participantCode}>
                  <td className="py-1.5 font-mono">{s.participantCode}</td>
                  <td>{s.segment}</td>
                  <td className="text-right">{s.durationSec === null ? "pågår" : `${s.durationSec} s`}</td>
                  <td className="text-right" data-col="ttp">{s.timeToPackageSec === null ? "–" : `${s.timeToPackageSec} s`}</td>
                  <td data-col="green">
                    <YesNo yes={s.sawGreenCheck} />
                  </td>
                  <td data-col="completed">
                    <YesNo yes={s.completed} />
                  </td>
                  <td className="text-right" data-col="errors">{s.validationErrors}</td>
                  <td className="text-right" data-col="confidence">{s.confidence ?? "–"}</td>
                  <td className="max-w-64 truncate" title={s.notes}>{s.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const STEP_LABEL: Record<string, string> = { budget: "Budsjett", use: "Bruk", games: "Spill", screen: "Skjerm", wishes: "Ønsker" };

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
      {sub && <dd className="text-xs text-muted-foreground">{sub}</dd>}
    </div>
  );
}

function Bar({ label, value, max, suffix }: { label: string; value: number; max: number; suffix: string }) {
  return (
    <li className="grid grid-cols-[9rem_1fr_auto] items-center gap-3 text-sm">
      <span>{label}</span>
      <span className="h-3 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span className="block h-full rounded-r-[4px] bg-primary" style={{ width: `${(value / max) * 100}%` }} />
      </span>
      <span className="tabular-nums">
        <strong>{value}</strong> <span className="text-muted-foreground">({suffix})</span>
      </span>
    </li>
  );
}

function YesNo({ yes }: { yes: boolean }) {
  return yes ? (
    <span className="inline-flex items-center gap-1 text-ok">
      <CheckCircle2 aria-hidden className="size-4" /> Ja
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <XCircle aria-hidden className="size-4" /> Nei
    </span>
  );
}
