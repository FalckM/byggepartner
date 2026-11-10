"use client";
// DP2, DP4, US-04, US-06 — What must be fixed, with a one-click fix that is guaranteed to work.
import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics/track";
import { useExpert } from "@/lib/client/prefs-store";
import { catalogIndex } from "@/lib/engine/context";
import { formatNok } from "@/lib/engine/labels";
import type { RuleResult, ValidationReport } from "@/lib/engine/report";
import type { BuildItem, Catalog, Category } from "@/lib/engine/types";
import { SeverityIcon } from "./fit-status";

export interface FixHandlers {
  onReplace: (oldId: string, item: BuildItem) => void;
  onAdd: (item: BuildItem) => void;
  onRemove: (id: string) => void;
  onBrowse: (category: Category, replaceId?: string) => void;
}

export function ProblemList({ report, catalog, expert: forceExpert, ...h }: { report: ValidationReport; catalog: Catalog; expert?: boolean } & FixHandlers) {
  const expertPref = useExpert();
  const expert = forceExpert || expertPref;
  const idx = catalogIndex(catalog);
  const errors = dedupe(report.results.filter((r) => !r.passed && r.severity === "ERROR"));
  const advice = dedupe(report.results.filter((r) => !r.passed && r.severity !== "ERROR"));
  if (!errors.length && !advice.length) return null;

  const fixButton = (r: RuleResult) => {
    const fix = r.fixSuggestion;
    if (!fix) return null;
    const current = r.involved.find((id) => idx.get(id)?.category === fix.category);
    const first = fix.candidateIds?.[0] ? idx.get(fix.candidateIds[0]) : undefined;
    const curPrice = current ? (idx.get(current)?.priceNok ?? 0) : 0;
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {fix.action === "REMOVE" && current && (
          <Button size="sm" className="min-h-10" onClick={() => { track("checklist_fix_clicked", { rule: r.ruleId, action: "REMOVE" }); h.onRemove(current); }}>
            <Wrench aria-hidden /> Fjern den ekstra delen
          </Button>
        )}
        {fix.action !== "REMOVE" && first && (
          <Button
            size="sm"
            className="min-h-10"
            data-testid="one-click-fix"
            onClick={() => {
              track("checklist_fix_clicked", { rule: r.ruleId, action: fix.action, to: first.id });
              const item = { category: first.category, componentId: first.id, qty: 1 };
              if (fix.action === "REPLACE" && current) h.onReplace(current, item);
              else h.onAdd(item);
            }}
          >
            <Wrench aria-hidden /> {fix.action === "ADD" ? "Legg til" : "Bytt til"} {first.name}
            <span className="font-normal opacity-80">
              ({first.priceNok - curPrice >= 0 ? "+" : "−"}
              {formatNok(Math.abs(first.priceNok - curPrice))})
            </span>
          </Button>
        )}
        {fix.action !== "REMOVE" && (
          <Button size="sm" variant="outline" className="min-h-10" onClick={() => h.onBrowse(fix.category, current)}>
            Se alle som passer
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {errors.length > 0 && (
        <ul className="space-y-3" data-testid="error-list">
          {errors.map((r, i) => (
            <li key={i} className="rounded-xl border border-err/50 bg-card p-4">
              <p className="flex gap-2 font-medium">
                <SeverityIcon severity="ERROR" className="mt-1" /> {r.messagePlain}
              </p>
              {expert && <p className="mt-1 pl-6 font-mono text-xs text-muted-foreground">{r.ruleId}: {r.messageTechnical}</p>}
              <div className="pl-6">{fixButton(r)}</div>
            </li>
          ))}
        </ul>
      )}
      {advice.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">Råd (stopper ikke bestillingen)</p>
          <ul className="space-y-2">
            {advice.map((r, i) => (
              <li key={i} className="rounded-xl border bg-card p-3 text-sm">
                <p className="flex gap-2">
                  <SeverityIcon severity={r.severity} className="mt-0.5" /> {r.messagePlain}
                </p>
                {expert && <p className="mt-1 pl-6 font-mono text-xs text-muted-foreground">{r.ruleId}: {r.messageTechnical}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function dedupe(rs: RuleResult[]): RuleResult[] {
  const seen = new Set<string>();
  return rs.filter((r) => (seen.has(r.messagePlain) ? false : (seen.add(r.messagePlain), true)));
}
