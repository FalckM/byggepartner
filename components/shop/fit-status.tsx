"use client";
// DP4, US-06, RESP-03 — The ONLY place green is used: «Alt passer sammen». Shown iff report.ok.
import { AlertTriangle, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ValidationReport } from "@/lib/engine/report";
import { cn } from "@/lib/utils";

/** Small chip for package cards. */
export function FitChip({ report, className }: { report: ValidationReport; className?: string }) {
  if (report.ok) {
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full bg-ok-soft px-2.5 py-1 text-xs font-semibold text-foreground", className)}>
        <CheckCircle2 aria-hidden className="size-3.5 text-ok" /> Alt passer sammen
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-err-soft px-2.5 py-1 text-xs font-semibold", className)}>
      <XCircle aria-hidden className="size-3.5 text-err" /> Noe passer ikke
    </span>
  );
}

/** The big stamp – the one moment people remember. */
export function FitStamp({ report, totalRules, onShowChecks }: { report: ValidationReport; totalRules: number; onShowChecks?: () => void }) {
  const reduce = useReducedMotion();
  const errors = report.results.filter((r) => !r.passed && r.severity === "ERROR");
  const warnings = report.results.filter((r) => !r.passed && r.severity === "WARNING");
  const missing = report.checklist.filter((i) => i.required && i.status !== "OK");

  return (
    <div aria-live="polite" aria-atomic="true" data-testid="fit-status" data-ok={report.ok}>
      {report.ok ? (
        <motion.div
          key="ok"
          initial={reduce ? false : { scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="relative overflow-hidden rounded-2xl border-2 border-ok bg-ok-soft p-5"
        >
          <div className="flex items-start gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-dashed border-ok bg-card text-ok">
              <ShieldCheck aria-hidden className="size-8" />
            </span>
            <div className="space-y-1">
              <p className="font-heading text-2xl font-semibold" data-testid="green-check">
                Alt passer sammen
              </p>
              <p className="text-sm">
                Vi har sjekket {totalRules} ting – at delene passer fysisk, har nok strøm og at ingenting mangler.
                {warnings.length > 0 && ` ${warnings.length} råd står under, men ingenting hindrer deg i å bestille.`}
              </p>
              {onShowChecks && (
                <button type="button" onClick={onShowChecks} className="text-sm font-medium underline underline-offset-4">
                  Se hva vi har sjekket
                </button>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="rounded-2xl border-2 border-err bg-err-soft p-5">
          <p className="flex items-center gap-2 font-heading text-xl font-semibold">
            <XCircle aria-hidden className="size-6 text-err" />
            {errors.length > 0 ? "Noe passer ikke sammen" : "Pakken er ikke komplett ennå"}
          </p>
          <p className="mt-1 text-sm">
            {errors.length > 0 && `${errors.length} ${errors.length === 1 ? "ting" : "ting"} må fikses. `}
            {missing.length > 0 && `${missing.length} nødvendig${missing.length === 1 ? "" : "e"} del${missing.length === 1 ? "" : "er"} mangler. `}
            Bruk knappene under – vi foreslår bare deler som passer.
          </p>
        </div>
      )}
    </div>
  );
}

export function SeverityIcon({ severity, className }: { severity: "ERROR" | "WARNING" | "INFO"; className?: string }) {
  if (severity === "ERROR") return <XCircle aria-hidden className={cn("size-4 shrink-0 text-err", className)} />;
  if (severity === "WARNING") return <AlertTriangle aria-hidden className={cn("size-4 shrink-0 text-warn", className)} />;
  return <AlertTriangle aria-hidden className={cn("size-4 shrink-0 text-muted-foreground", className)} />;
}
