"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Play, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABEL, formatNok } from "@/lib/engine/labels";
import { runScenario, type ScenarioRun } from "@/lib/engine/scenarioRunner";
import type { Component, Game, Scenario } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

const TIER_LABEL = { SAVE: "Spar", RECOMMENDED: "Anbefalt", PERFORMANCE: "Ytelse" } as const;

export function ScenarioRunner({ catalog, games, scenarios }: { catalog: Component[]; games: Game[]; scenarios: Scenario[] }) {
  const [runs, setRuns] = useState<ScenarioRun[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [ranAt, setRanAt] = useState<string>("");
  const names = useMemo(() => new Map(catalog.map((c) => [c.id, c.name])), [catalog]);

  const runAll = useCallback(() => {
    setRuns(scenarios.map((s) => runScenario(s, catalog, games)));
    setRanAt(new Date().toLocaleTimeString("nb-NO"));
  }, [scenarios, catalog, games]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- run once on mount (client-only engine)
  useEffect(() => runAll(), [runAll]);

  const passed = runs.filter((r) => r.status === "PASS").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={runAll} size="lg">
          <Play aria-hidden /> Kjør alle
        </Button>
        <p aria-live="polite" className="text-sm" data-testid="scenario-summary">
          {runs.length ? (
            <>
              <strong>
                {passed} av {runs.length} bestått
              </strong>{" "}
              · kjørt {ranAt}
            </>
          ) : (
            "Kjører …"
          )}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border" tabIndex={0} role="region" aria-label="Scenarietabell">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="w-8 p-2"><span className="sr-only">Detaljer</span></th>
              <th className="p-2">Status</th>
              <th className="p-2">Scenario</th>
              <th className="p-2">Basert på</th>
              <th className="p-2 text-right">Tid</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s) => {
              const run = runs.find((r) => r.id === s.id);
              const isOpen = open === s.id;
              return (
                <Fragment key={s.id}>
                  <tr className="border-t" data-testid="scenario-row" data-status={run?.status}>
                    <td className="p-2">
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? null : s.id)}
                        aria-expanded={isOpen}
                        aria-label={`${isOpen ? "Skjul" : "Vis"} detaljer for ${s.id}`}
                        className="grid size-8 place-items-center rounded-md hover:bg-muted"
                      >
                        {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      </button>
                    </td>
                    <td className="p-2">{run ? <Status ok={run.status === "PASS"} /> : "…"}</td>
                    <td className="p-2">
                      <span className="font-mono font-medium">{s.id}</span> {s.description}
                    </td>
                    <td className="p-2 text-muted-foreground">{s.basedOn}</td>
                    <td className="p-2 text-right whitespace-nowrap tabular-nums">{run ? `${run.durationMs.toFixed(1)} ms` : ""}</td>
                  </tr>
                  {isOpen && run && (
                    <tr className="bg-muted/30">
                      <td colSpan={5} className="space-y-3 p-3">
                        <ul className="space-y-1">
                          {run.checks.map((c, i) => (
                            <li key={i} className="flex gap-2">
                              <Status ok={c.passed} compact />
                              <span>
                                {c.name}
                                {c.detail && <span className="text-muted-foreground"> — {c.detail}</span>}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {run.generated?.ok &&
                          run.generated.packages.map((p) => (
                            <div key={p.tier} className="rounded-md border bg-background p-3">
                              <p className="font-medium">
                                {TIER_LABEL[p.tier]} · {formatNok(p.totalNok)} · score {p.score}
                                {p.fps.length > 0 && (
                                  <span className="font-normal text-muted-foreground">
                                    {" "}· {p.fps.map((f) => `${f.gameName} ${f.low}–${f.high} fps`).join(", ")}
                                  </span>
                                )}
                              </p>
                              <ul className="mt-1 grid gap-x-4 text-xs sm:grid-cols-2">
                                {p.items.map((i) => (
                                  <li key={i.componentId}>
                                    <span className="text-muted-foreground">{CATEGORY_LABEL[i.category]}:</span>{" "}
                                    {names.get(i.componentId)}
                                    {i.owned && " (har fra før)"}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        {run.generated && !run.generated.ok && <p>{run.generated.message}</p>}
                        {!run.generated && run.report && (
                          <ul className="text-xs">
                            {run.report.results
                              .filter((r) => !r.passed)
                              .map((r, i) => (
                                <li key={i}>
                                  <span className="font-mono">{r.severity} {r.ruleId}</span> — {r.messagePlain}
                                  {r.fixSuggestion?.candidateIds?.length ? (
                                    <span className="text-muted-foreground">
                                      {" "}· fiks: {r.fixSuggestion.candidateIds.slice(0, 3).map((id) => names.get(id)).join(", ")}
                                    </span>
                                  ) : null}
                                </li>
                              ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Status({ ok, compact }: { ok: boolean; compact?: boolean }) {
  const Icon = ok ? CheckCircle2 : XCircle;
  return (
    <span className={cn("inline-flex items-center gap-1 font-medium", ok ? "text-ok" : "text-err")}>
      <Icon aria-hidden className="size-4 shrink-0" />
      <span className={compact ? "sr-only" : ""}>{ok ? "Bestått" : "Feilet"}</span>
    </span>
  );
}
