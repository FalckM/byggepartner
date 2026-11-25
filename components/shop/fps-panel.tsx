// US-09, RESP-01 — Estimated performance per game as a range bar (low–high) with the monitor's target.
import { Gauge } from "lucide-react";
import { bottleneckText, targetText, type FpsEstimate } from "@/lib/engine/performance";

export function FpsPanel({ fps, targetHz }: { fps: FpsEstimate[]; targetHz: number }) {
  if (fps.length === 0) return null;
  const scaleMax = Math.max(targetHz * 1.25, ...fps.map((f) => f.high)) * 1.05;
  const pos = (v: number) => `${Math.min(100, (v / scaleMax) * 100)}%`;
  return (
    <section aria-labelledby="fps-title" className="rounded-xl border bg-card p-4">
      <h2 id="fps-title" className="flex items-center gap-2 text-lg font-semibold">
        <Gauge aria-hidden className="size-5" /> Estimert ytelse
      </h2>
      <p className="text-sm text-muted-foreground" title="Basert på typiske tester – faktiske tall varierer med innstillinger.">
        Bilder i sekundet (fps). Basert på typiske tester – faktiske tall varierer med innstillinger.
      </p>
      <ul className="mt-4 space-y-5">
        {fps.map((f) => (
          <li key={f.game} data-testid="fps-row" data-game={f.game}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="font-medium">{f.gameName}</span>
              <span className="text-sm tabular-nums">
                <strong>
                  {f.low}–{f.high} fps
                </strong>{" "}
                · {f.label}
              </span>
            </div>
            <div className="relative mt-2 h-3 rounded-full bg-muted" aria-hidden>
              <div className="absolute inset-y-0 rounded-full bg-primary" style={{ left: pos(f.low), right: `calc(100% - ${pos(f.high)})` }} />
              <div className="absolute -inset-y-1 w-0.5 bg-foreground" style={{ left: pos(targetHz) }} />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {targetText(f, targetHz)} · {bottleneckText(f)}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">Den loddrette streken viser {targetHz} Hz – det skjermen din kan vise.</p>
    </section>
  );
}
