"use client";
// US-06 — «Se hva vi har sjekket»: every rule in plain words, with the result for this package.
import { CheckCircle2, MinusCircle } from "lucide-react";
import { useExpert } from "@/lib/client/prefs-store";
import { RULE_EXPLANATION } from "@/lib/engine/explain";
import type { ValidationReport } from "@/lib/engine/report";
import { RULES } from "@/lib/engine/rules";
import { SeverityIcon } from "./fit-status";

export function RulesChecked({ report }: { report: ValidationReport }) {
  const expert = useExpert();
  return (
    <ul className="grid gap-2 text-sm sm:grid-cols-2" data-testid="rules-checked">
      {RULES.map((rule) => {
        const rs = report.results.filter((r) => r.ruleId === rule.id);
        const failed = rs.find((r) => !r.passed);
        return (
          <li key={rule.id} className="flex gap-2 rounded-lg bg-card p-2.5">
            {rs.length === 0 ? (
              <MinusCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            ) : failed ? (
              <SeverityIcon severity={failed.severity} className="mt-0.5" />
            ) : (
              <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-ok" />
            )}
            <span>
              <span className="font-medium">{rule.title}</span>
              <span className="block text-xs text-muted-foreground">
                {rs.length === 0 ? "Ikke aktuelt for denne pakken. " : ""}
                {RULE_EXPLANATION[rule.id]}
              </span>
              {expert &&
                rs.map((r, i) => (
                  <span key={i} className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                    {rule.id}: {r.messageTechnical}
                  </span>
                ))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
