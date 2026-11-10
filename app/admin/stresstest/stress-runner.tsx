"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CheckCircle2, Play, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Component, Game } from "@/lib/engine/types";
import { randomProfiles, runOne, summarise, type StressSample, type StressSummary } from "@/lib/stress/runStress";
import { cn } from "@/lib/utils";

const RUNS = 500;
const CHUNK = 10;

export function StressRunner({ games }: { games: Game[] }) {
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<StressSummary | null>(null);
  const [catalogSize, setCatalogSize] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    setSummary(null);
    setProgress(0);
    try {
      const res = await fetch("/stress/catalog.json");
      if (!res.ok) throw new Error("Fant ikke stresskatalogen – kjør `pnpm seed:stress`.");
      const catalog = (await res.json()) as Component[];
      setCatalogSize(catalog.length);
      const profiles = randomProfiles(RUNS, games);
      const samples: StressSample[] = [];
      for (let i = 0; i < profiles.length; i += CHUNK) {
        for (const p of profiles.slice(i, i + CHUNK)) samples.push(runOne(p, catalog, games));
        setProgress(samples.length);
        setSummary(summarise(samples));
        await new Promise((r) => setTimeout(r, 0)); // keep the page responsive
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={run} disabled={running} size="lg">
          <Play aria-hidden /> {running ? "Kjører …" : `Kjør stresstest (${RUNS} profiler)`}
        </Button>
        {(running || summary) && (
          <div className="flex min-w-48 flex-1 items-center gap-3">
            <div
              role="progressbar"
              aria-label="Fremdrift"
              aria-valuemin={0}
              aria-valuemax={RUNS}
              aria-valuenow={progress}
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
            >
              {/* Primary, not green: green is reserved for «passer» (spec 9.2). */}
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${(progress / RUNS) * 100}%` }} />
            </div>
            <span className="text-sm tabular-nums whitespace-nowrap">
              {progress} / {RUNS}
            </span>
          </div>
        )}
      </div>
      {error && <p className="text-err">{error}</p>}

      {summary && (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5" data-testid="stress-kpis">
            <Kpi label="Gyldige pakker" value={`${summary.validPct.toFixed(1)} %`} ok={summary.validPct === 100} target="mål 100 %" />
            <Kpi label="p50 kjøretid" value={`${summary.p50.toFixed(0)} ms`} />
            <Kpi label="p95 kjøretid" value={`${summary.p95.toFixed(0)} ms`} ok={summary.p95 < 300} target="mål < 300 ms" />
            <Kpi label="For lavt budsjett" value={String(summary.budgetTooLow)} />
            <Kpi label="Katalog" value={`${catalogSize} deler`} />
          </dl>

          <section aria-labelledby="hist-title" className="rounded-lg border bg-card p-4">
            <h2 id="hist-title" className="font-medium">
              Budsjettutnyttelse for «Anbefalt»
            </h2>
            <p className="text-sm text-muted-foreground">Antall profiler etter hvor stor del av budsjettet pakken bruker.</p>
            <div className="mt-3 grid gap-4 md:grid-cols-[1fr_auto]">
              <div className="h-56 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.histogram} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="bucket" tickLine={false} axisLine={{ stroke: "var(--border)" }} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                    <Tooltip
                      cursor={{ fill: "var(--muted)" }}
                      contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--popover-foreground)" }}
                      formatter={(v) => [`${v} profiler`, "Antall"]}
                    />
                    <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <table className="self-start text-sm">
                <caption className="sr-only">Budsjettutnyttelse som tabell</caption>
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pr-4 font-normal">Andel av budsjett</th>
                    <th className="text-right font-normal">Profiler</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {summary.histogram.map((h) => (
                    <tr key={h.bucket}>
                      <td className="pr-4">{h.bucket}</td>
                      <td className="text-right">{h.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {summary.failures.length > 0 && (
            <section className="rounded-lg border border-err bg-err-soft p-4">
              <h2 className="font-medium">Ugyldige resultater ({summary.failures.length})</h2>
              <ul className="mt-2 text-sm">
                {summary.failures.slice(0, 20).map((f, i) => (
                  <li key={i}>
                    {f.budgetNok} kr: {f.error}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, ok, target }: { label: string; value: string; ok?: boolean; target?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
      {ok !== undefined && (
        <dd className={cn("mt-1 flex items-center gap-1 text-xs font-medium", ok ? "text-ok" : "text-err")}>
          {ok ? <CheckCircle2 aria-hidden className="size-3.5" /> : <XCircle aria-hidden className="size-3.5" />}
          {ok ? "Bestått" : "Ikke nådd"} · {target}
        </dd>
      )}
    </div>
  );
}
