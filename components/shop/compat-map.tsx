"use client";
// US-21 — Visual compatibility map: parts = nodes, rule checks = wires (green/yellow/red + icon + dash).
import { useMemo, useState } from "react";
import { useExpert } from "@/lib/client/prefs-store";
import { compatGraph, type EdgeStatus, type GraphEdge } from "@/lib/engine/compatGraph";
import { RULE_EXPLANATION } from "@/lib/engine/explain";
import { CATEGORY_LABEL } from "@/lib/engine/labels";
import type { ValidationReport } from "@/lib/engine/report";
import { RULES } from "@/lib/engine/rules";
import type { BuildItem, Catalog, Category } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

const POS: Partial<Record<Category, [number, number]>> = {
  CPU: [210, 50],
  COOLER: [350, 50],
  GPU: [70, 200],
  MOTHERBOARD: [210, 200],
  RAM: [350, 200],
  PSU: [70, 350],
  CASE: [210, 350],
  STORAGE: [350, 350],
};
const W = 116;
const H = 50;

const STYLE: Record<EdgeStatus, { stroke: string; dash?: string; icon: string; word: string; width: number }> = {
  OK: { stroke: "var(--ok)", icon: "✓", word: "passer", width: 2.5 },
  INFO: { stroke: "var(--muted-foreground)", dash: "1 5", icon: "i", word: "til info", width: 2 },
  WARNING: { stroke: "var(--warn)", dash: "8 5", icon: "!", word: "råd", width: 3 },
  ERROR: { stroke: "var(--err)", dash: "3 4", icon: "✕", word: "passer ikke", width: 3.5 },
};
const TITLE = new Map(RULES.map((r) => [r.id, r.title]));

type Pt = readonly [number, number];
const quad = (a: Pt, c: Pt, b: Pt, t: number): Pt => [
  (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t ** 2 * b[0],
  (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t ** 2 * b[1],
];

/** Pick the smallest bend that keeps the wire (and its status marker) clear of other nodes. */
function geometry(e: GraphEdge, present: Category[]) {
  const a = POS[e.from]!;
  const b = POS[e.to]!;
  const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n: Pt = [-(b[1] - a[1]) / dist, (b[0] - a[0]) / dist];
  const m: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const others = present.filter((c) => c !== e.from && c !== e.to).map((c) => POS[c]!).filter(Boolean);
  const hits = (p: Pt, pad: number) => others.some((o) => Math.abs(p[0] - o[0]) < W / 2 + pad && Math.abs(p[1] - o[1]) < H / 2 + pad);
  let best = { c: m, cost: Number.POSITIVE_INFINITY };
  for (const bend of [0, 40, -40, 80, -80, 120, -120]) {
    const c: Pt = [m[0] + n[0] * bend, m[1] + n[1] * bend];
    const samples = [0.2, 0.35, 0.5, 0.65, 0.8].map((t) => quad(a, c, b, t));
    const cost = samples.filter((p) => hits(p, 4)).length * 10 + (hits(quad(a, c, b, 0.5), 14) ? 50 : 0) + Math.abs(bend) / 40;
    if (cost < best.cost) best = { c, cost };
  }
  return { a, b, c: best.c, d: `M${a[0]},${a[1]} Q${best.c[0]},${best.c[1]} ${b[0]},${b[1]}`, hits };
}

/** Lay out all wires; status markers are placed problems-first so they never cover each other. */
function layout(edges: GraphEdge[], present: Category[]) {
  const placed: Pt[] = [];
  return edges.map((e) => {
    const g = geometry(e, present);
    let mid = quad(g.a, g.c, g.b, 0.5);
    for (const t of [0.5, 0.4, 0.6, 0.32, 0.68, 0.25, 0.75]) {
      const p = quad(g.a, g.c, g.b, t);
      if (!g.hits(p, 6) && placed.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) > 24)) {
        mid = p;
        break;
      }
    }
    placed.push(mid);
    return { edge: e, d: g.d, mid };
  });
}

export function CompatMap({ items, catalog, report }: { items: BuildItem[]; catalog: Catalog; report: ValidationReport }) {
  const expert = useExpert();
  const { nodes, edges } = useMemo(() => compatGraph(items, catalog, report), [items, catalog, report]);
  const [selected, setSelected] = useState<string | null>(null);
  const wires = useMemo(() => layout(edges, nodes.map((x) => x.category)), [edges, nodes]);
  const sel = edges.find((e) => e.key === selected) ?? edges.find((e) => e.status === "ERROR") ?? null;

  if (nodes.length < 2) return <p className="text-sm text-muted-foreground">Velg flere deler for å se hvordan de henger sammen.</p>;
  const label = (e: GraphEdge) => `${CATEGORY_LABEL[e.from]} og ${CATEGORY_LABEL[e.to]}: ${STYLE[e.status].word}`;

  return (
    <div className="space-y-4" data-testid="compat-map">
      <svg viewBox="0 0 420 420" className="mx-auto w-full max-w-md" role="group" aria-label="Kompatibilitetskart. Velg en ledning for å se hva vi har sjekket.">
        {/* edges are sorted problems-first; draw them last so they sit on top */}
        {[...wires].reverse().map(({ edge: e, d, mid }) => {
          const g = { d, mid };
          const s = STYLE[e.status];
          const isSel = sel?.key === e.key;
          const activate = () => setSelected(e.key);
          return (
            <g
              key={e.key}
              role="button"
              tabIndex={0}
              aria-label={label(e)}
              aria-pressed={isSel}
              data-testid="compat-edge"
              data-status={e.status}
              onClick={activate}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.preventDefault();
                  activate();
                }
              }}
              className="cursor-pointer outline-none [&:focus-visible_.hit]:stroke-ring/40"
            >
              <path d={g.d} className="hit" fill="none" stroke="transparent" strokeWidth={18} />
              <path d={g.d} fill="none" stroke={s.stroke} strokeWidth={isSel ? s.width + 1.5 : s.width} strokeDasharray={s.dash} strokeLinecap="round" />
              <circle cx={g.mid[0]} cy={g.mid[1]} r={isSel ? 11 : 9} fill="var(--card)" stroke={s.stroke} strokeWidth={2} />
              <text x={g.mid[0]} y={g.mid[1] + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={s.stroke} aria-hidden>
                {s.icon}
              </text>
            </g>
          );
        })}
        {nodes.map((n) => {
          const p = POS[n.category];
          if (!p) return null;
          return (
            <g key={n.id} aria-hidden>
              <rect x={p[0] - W / 2} y={p[1] - H / 2} width={W} height={H} rx={12} fill="var(--card)" stroke="var(--border)" strokeWidth={1.5} />
              <text x={p[0]} y={p[1] - 4} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--foreground)">
                {CATEGORY_LABEL[n.category]}
              </text>
              <text x={p[0]} y={p[1] + 13} textAnchor="middle" fontSize={10} fill="var(--muted-foreground)">
                {n.name.length > 20 ? `${n.name.slice(0, 19)}…` : n.name}
              </text>
            </g>
          );
        })}
      </svg>

      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs" aria-label="Forklaring">
        {(["OK", "WARNING", "ERROR"] as const).map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <svg width="28" height="10" aria-hidden>
              <line x1="2" y1="5" x2="26" y2="5" stroke={STYLE[k].stroke} strokeWidth={3} strokeDasharray={STYLE[k].dash} strokeLinecap="round" />
            </svg>
            {STYLE[k].icon} {STYLE[k].word[0].toUpperCase() + STYLE[k].word.slice(1)}
          </li>
        ))}
      </ul>

      {sel && (
        <div className="rounded-xl border bg-card p-4" aria-live="polite" data-testid="compat-detail">
          <p className="font-semibold">
            {CATEGORY_LABEL[sel.from]} ↔ {CATEGORY_LABEL[sel.to]}
          </p>
          <ul className="mt-2 space-y-2 text-sm">
            {sel.results.map((r, i) => (
              <li key={i}>
                {r.passed ? (
                  <span className="font-medium">✓ {TITLE.get(r.ruleId as never) ?? r.ruleId}:</span>
                ) : (
                  <span className={cn("font-medium", r.severity === "ERROR" && "text-err")}>
                    {r.severity === "ERROR" ? "✕ Passer ikke:" : r.severity === "WARNING" ? "! Råd:" : "i Til info:"}
                  </span>
                )}{" "}
                {r.messagePlain}
                <span className="block text-xs text-muted-foreground">{RULE_EXPLANATION[r.ruleId]}</span>
                {expert && <span className="block font-mono text-[11px] text-muted-foreground">{r.ruleId}: {r.messageTechnical}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer font-medium">Vis som liste</summary>
        <ul className="mt-2 space-y-1">
          {edges.map((e) => (
            <li key={e.key}>
              {STYLE[e.status].icon} {label(e)} – {e.results.map((r) => r.messagePlain).join(" ")}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
