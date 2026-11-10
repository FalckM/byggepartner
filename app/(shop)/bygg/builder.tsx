"use client";
// US-14, DP2, RESP-04 — Free build with live validation (same engine, runs in the browser).
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw, ShoppingBag, Sparkles, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/shop/category-icon";
import { ChecklistView } from "@/components/shop/checklist-view";
import { FitStamp } from "@/components/shop/fit-status";
import { PowerMeter } from "@/components/shop/power-meter";
import { ProblemList } from "@/components/shop/problem-list";
import { SwapSheet } from "@/components/shop/swap-sheet";
import { EXAMPLE_BUILD, MULTI, useBuilder, useBuilderHydrated } from "@/lib/client/builder-store";
import { useCart } from "@/lib/client/cart-store";
import { specSummary } from "@/lib/catalog/specSummary";
import { compatibleAlternatives, perfValue } from "@/lib/engine/alternatives";
import { matchesQuery } from "@/lib/data/source";
import { CATEGORY_LABEL, STOCK_LABEL, formatNok } from "@/lib/engine/labels";
import { RULES } from "@/lib/engine/rules";
import type { Catalog, Category } from "@/lib/engine/types";
import { validate } from "@/lib/engine/validate";
import { cn } from "@/lib/utils";

const TABS: Category[] = ["CPU", "MOTHERBOARD", "RAM", "GPU", "STORAGE", "CASE", "COOLER", "PSU", "OS", "ACCESSORY"];

export function Builder({ catalog }: { catalog: Catalog }) {
  const router = useRouter();
  const hydrated = useBuilderHydrated();
  const { items, pick, replace, add, remove, load } = useBuilder();
  const setPackage = useCart((s) => s.setPackage);
  const [tab, setTab] = useState<Category>("CPU");
  const [browse, setBrowse] = useState<{ category: Category; id?: string } | null>(null);
  const [q, setQ] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [onlyFits, setOnlyFits] = useState(false);
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState<"price" | "perf">("price");
  const report = useMemo(() => validate(items, catalog, { includeOs: true }), [items, catalog]);

  const current = items.find((i) => i.category === tab && !MULTI.includes(tab));
  const status = useMemo(() => {
    const alt = compatibleAlternatives(items, tab, catalog, { replaceComponentId: current?.componentId ?? "__none__" });
    const bad = new Map(alt.incompatible.map((x) => [x.component.id, x.reasons[0]]));
    const warn = new Map(alt.compatible.filter((x) => x.warnings.length).map((x) => [x.component.id, x.warnings[0].messagePlain]));
    return { bad, warn };
  }, [items, tab, catalog, current]);

  const chosen = new Set(items.map((i) => i.componentId));
  const max = Number.parseInt(maxPrice, 10);
  const rows = catalog
    .filter((c) => matchesQuery(c, { category: tab, q: q || undefined, maxPrice: Number.isFinite(max) ? max : undefined }))
    .filter((c) => !onlyFits || !status.bad.has(c.id) || chosen.has(c.id))
    .filter((c) => !inStock || c.stock === "IN_STOCK" || c.stock === "LOW")
    .sort((a, b) => (sort === "perf" ? (perfValue(b) ?? 0) - (perfValue(a) ?? 0) : 0) || a.priceNok - b.priceNok);

  if (!hydrated) return <p className="text-muted-foreground">Laster …</p>;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">Bygg selv</h1>
          <p className="mt-1 text-muted-foreground">Velg delene selv – vi sjekker alt mens du bygger. Deler som ikke passer, er gråtonet med grunnen.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="min-h-11" onClick={() => load(EXAMPLE_BUILD)}>
            <Sparkles aria-hidden /> Start fra et eksempel
          </Button>
          <Button variant="ghost" className="min-h-11" onClick={() => load([])}>
            <RotateCcw aria-hidden /> Tøm
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="min-w-0 space-y-4">
          <div role="tablist" aria-label="Kategori" className="flex gap-1.5 overflow-x-auto pb-1">
            {TABS.map((t) => {
              const has = items.some((i) => i.category === t);
              return (
                <button
                  key={t}
                  role="tab"
                  type="button"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium",
                    tab === t ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary",
                  )}
                >
                  <CategoryIcon category={t} className="size-4" />
                  {CATEGORY_LABEL[t]}
                  {has && <Check aria-label="valgt" className="size-3.5" />}
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 rounded-xl border bg-card p-3 sm:grid-cols-2 lg:grid-cols-4" role="search" aria-label="Filtrer deler">
            <div className="space-y-1">
              <label htmlFor="b-q" className="text-xs font-medium text-muted-foreground">Søk</label>
              <input id="b-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Navn eller modell" className="h-10 w-full rounded-lg border bg-background px-3 text-sm" />
            </div>
            <div className="space-y-1">
              <label htmlFor="b-max" className="text-xs font-medium text-muted-foreground">Maks pris (kr)</label>
              <input id="b-max" inputMode="numeric" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ""))} className="h-10 w-full rounded-lg border bg-background px-3 text-sm" />
            </div>
            <div className="space-y-1">
              <label htmlFor="b-sort" className="text-xs font-medium text-muted-foreground">Sortering</label>
              <select id="b-sort" value={sort} onChange={(e) => setSort(e.target.value as "price" | "perf")} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
                <option value="price">Pris – lav til høy</option>
                <option value="perf">Ytelse / størrelse – høy til lav</option>
              </select>
            </div>
            <div className="flex flex-col justify-end gap-1.5 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={onlyFits} onChange={(e) => setOnlyFits(e.target.checked)} className="size-4 accent-[var(--primary)]" /> Vis bare det som passer</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="size-4 accent-[var(--primary)]" /> Bare på lager</label>
            </div>
          </div>
          <p className="text-sm text-muted-foreground" aria-live="polite">{rows.length} deler · {rows.filter((r) => status.bad.has(r.id)).length} passer ikke med det du har valgt</p>

          <div role="tabpanel" aria-label={CATEGORY_LABEL[tab]}>
          <ul className="divide-y rounded-xl border bg-card" data-testid="builder-list">
            {rows.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Ingen deler matcher filtrene.</li>}
            {rows.map((c) => {
              const reason = status.bad.get(c.id);
              const warning = status.warn.get(c.id);
              const isChosen = chosen.has(c.id);
              const out = c.stock === "OUT";
              return (
                <li
                  key={c.id}
                  title={reason && !isChosen ? `Passer ikke: ${reason}` : undefined}
                  className={cn("flex flex-wrap items-center gap-3 p-3", reason && !isChosen && "bg-muted/70 [&_.font-medium]:text-muted-foreground")}
                  data-testid="builder-row"
                  data-id={c.id}
                  data-fits={!reason}
                >
                  <div className="min-w-0 flex-1 basis-64">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{specSummary(c)}</p>
                    {reason && !isChosen && (
                      <p className="mt-1 flex gap-1.5 text-xs">
                        <XCircle aria-hidden className="size-3.5 shrink-0 text-err" /> Passer ikke: {reason}
                      </p>
                    )}
                    {warning && !isChosen && <p className="mt-1 text-xs text-muted-foreground">Råd: {warning}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{formatNok(c.priceNok)}</p>
                    <p className="text-xs text-muted-foreground">{STOCK_LABEL[c.stock]}</p>
                  </div>
                  {isChosen ? (
                    <Button variant="secondary" className="min-h-11 min-w-28" onClick={() => remove(c.id)} aria-label={`Fjern ${c.name}`}>
                      <Check aria-hidden /> Valgt
                    </Button>
                  ) : (
                    <Button
                      variant={reason ? "outline" : "default"}
                      className="min-h-11 min-w-28"
                      disabled={out}
                      onClick={() => pick({ category: c.category, componentId: c.id, qty: 1 })}
                      aria-label={`${reason ? "Velg likevel" : MULTI.includes(tab) ? "Legg til" : "Velg"} ${c.name}`}
                    >
                      {out ? "Utsolgt" : reason ? "Velg likevel" : MULTI.includes(tab) ? "Legg til" : "Velg"}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start" aria-label="Sjekk av pakken">
          <FitStamp report={report} totalRules={RULES.length} />
          <ProblemList report={report} catalog={catalog} expert onReplace={replace} onAdd={add} onRemove={remove} onBrowse={(category, id) => setBrowse({ category, id })} />
          <div className="rounded-2xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Totalt</p>
            <p className="font-heading text-3xl font-semibold tabular-nums">{formatNok(report.totalNok)}</p>
            <Button
              className="mt-3 min-h-12 w-full rounded-full"
              disabled={!items.length}
              onClick={() => {
                setPackage({ items, tier: "CUSTOM" });
                router.push("/handlekurv");
              }}
            >
              <ShoppingBag aria-hidden /> Legg i handlekurven
            </Button>
          </div>
          <ChecklistView items={report.checklist} catalog={catalog} onAdd={add} />
          <PowerMeter power={report.power} />
        </aside>
      </div>

      <SwapSheet
        open={!!browse}
        onOpenChange={(o) => !o && setBrowse(null)}
        items={items}
        category={browse?.category ?? null}
        replaceId={browse?.id}
        catalog={catalog}
        onSwap={(item) => {
          if (browse?.id) replace(browse.id, item);
          else add(item);
          setBrowse(null);
        }}
      />
    </div>
  );
}
