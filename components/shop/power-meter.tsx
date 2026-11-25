// US-15, RESP-02 — «Bruker ca. 420 W av 650 W – god margin.»
import { Zap } from "lucide-react";
import type { PowerReport } from "@/lib/engine/report";
import { cn } from "@/lib/utils";

const TEXT: Record<PowerReport["status"], string> = {
  GOOD: "god margin",
  TIGHT: "liten margin",
  TOO_WEAK: "for svak",
  NO_PSU: "velg strømforsyning",
};

export function PowerMeter({ power }: { power: PowerReport }) {
  const pct = power.psuW ? Math.min(100, (power.lastW / power.psuW) * 100) : 0;
  const tone = power.status === "GOOD" ? "bg-primary" : power.status === "TIGHT" ? "bg-warn" : "bg-err";
  return (
    <div className="rounded-xl border bg-card p-4" data-testid="power-meter">
      <p className="flex items-center gap-2 font-medium">
        <Zap aria-hidden className="size-4" /> Strøm
      </p>
      <p className="mt-1 text-sm">
        {power.psuW ? (
          <>
            Bruker ca. <strong>{power.lastW} W</strong> av {power.psuW} W – {TEXT[power.status]}.
          </>
        ) : (
          <>PC-en trenger ca. {power.lastW} W. Vi anbefaler minst {power.anbefaltW} W.</>
        )}
      </p>
      {power.psuW && (
        <div
          role="meter"
          aria-label="Strømforbruk av strømforsyningens kapasitet"
          aria-valuemin={0}
          aria-valuemax={power.psuW}
          aria-valuenow={power.lastW}
          className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted"
        >
          <div className={cn("h-full rounded-full transition-[width] duration-500", tone)} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
