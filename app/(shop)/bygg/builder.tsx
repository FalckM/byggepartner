"use client";
// US-14, DP2, RESP-04 — Free build, one part at a time, with live validation (same engine, runs in the browser).
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, ListChecks, RotateCcw, ShoppingBag, Sparkles, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/shop/category-icon";
import { ChecklistView } from "@/components/shop/checklist-view";
import { FitStamp, SeverityIcon } from "@/components/shop/fit-status";
import { PcDiagram, type PartState } from "@/components/shop/pc-diagram";
import { PowerMeter } from "@/components/shop/power-meter";
import { ProblemList } from "@/components/shop/problem-list";
import { deltaText } from "@/components/shop/swap-sheet";
import { EXAMPLE_BUILD, MULTI, useBuilder, useBuilderHydrated } from "@/lib/client/builder-store";
import { useCart } from "@/lib/client/cart-store";
import { useExpert } from "@/lib/client/prefs-store";
import { specSummary } from "@/lib/catalog/specSummary";
import { catalogIndex } from "@/lib/engine/context";
import { compatibleAlternatives, perfValue } from "@/lib/engine/alternatives";
import { CATEGORY_LABEL, STOCK_LABEL, formatNok } from "@/lib/engine/labels";
import type { ValidationReport } from "@/lib/engine/report";
import { RULES } from "@/lib/engine/rules";
import type { BuildItem, Catalog, Category, Component } from "@/lib/engine/types";
import { validate } from "@/lib/engine/validate";
import { cn } from "@/lib/utils";

/** The order parts are picked in: the CPU decides what fits, so it comes first. */
const STEPS: { category: Category; title: string; intro: string }[] = [
  { category: "CPU", title: "Velg prosessor", intro: "Prosessoren er hjernen i PC-en. Den bestemmer hvilke andre deler som passer, så vi starter her." },
  { category: "MOTHERBOARD", title: "Velg hovedkort", intro: "Hovedkortet kobler alle delene sammen. Vi viser først de som passer med prosessoren din." },
  { category: "RAM", title: "Velg minne", intro: "Minnet er PC-ens korttidshukommelse. 16 GB holder for de fleste, 32 GB er fint til tunge spill og redigering." },
  { category: "GPU", title: "Velg skjermkort", intro: "Skjermkortet lager grafikken. Det er den viktigste delen for hvor godt spill kjører." },
  { category: "STORAGE", title: "Velg lagring", intro: "Her bor Windows, programmer og spill. Du kan legge til flere disker." },
  { category: "CASE", title: "Velg kabinett", intro: "Kassen alt monteres i. Vi sjekker at skjermkortet og kjøleren får plass." },
  { category: "COOLER", title: "Velg CPU-kjøler", intro: "Kjøleren holder prosessoren kald og stille." },
  { category: "PSU", title: "Velg strømforsyning", intro: "Strømforsyningen gir strøm til alle delene. Vi regner ut om den er sterk nok." },
  { category: "OS", title: "Velg operativsystem", intro: "Med Windows er PC-en klar til bruk når den kommer. Har du allerede en lisens, kan du hoppe over." },
  { category: "ACCESSORY", title: "Tilbehør", intro: "Valgfritt: trådløst nett, kjølepasta og annet småtteri." },
];
const SUMMARY = STEPS.length;
const PAGE_SIZE = 6;

type Sort = "recommended" | "price" | "perf";
const SORTS: { id: Sort; label: string }[] = [
  { id: "recommended", label: "Anbefalt" },
  { id: "price", label: "Lavest pris" },
  { id: "perf", label: "Best ytelse" },
];

export function Builder({ catalog }: { catalog: Catalog }) {
  const router = useRouter();
  const hydrated = useBuilderHydrated();
  const { items, pick, replace, add, remove, load } = useBuilder();
  const setPackage = useCart((s) => s.setPackage);
  const [step, setStep] = useState(0);
  const report = useMemo(() => validate(items, catalog, { includeOs: true }), [items, catalog]);
  const idx = catalogIndex(catalog);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  useEffect(() => {
    if (moved.current) headingRef.current?.focus();
  }, [step]);
  const goTo = (n: number) => {
    moved.current = true;
    setStep(Math.max(0, Math.min(SUMMARY, n)));
  };
  const goToCategory = (c: Category) => goTo(STEPS.findIndex((s) => s.category === c));

  const states = useMemo(() => partStates(items, report, catalog), [items, report, catalog]);
  const errorCount = report.results.filter((r) => !r.passed && r.severity === "ERROR").length;
  const missing = report.checklist.filter((c) => c.status === "MISSING" && c.required).length;

  if (!hydrated) return <p className="text-muted-foreground">Laster …</p>;

  const current = step < SUMMARY ? STEPS[step] : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-tight font-bold">Bygg selv</h1>
          <p className="mt-1 text-muted-foreground">Velg én del om gangen – vi sjekker at alt passer mens du bygger.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => {
              load(EXAMPLE_BUILD);
              goTo(SUMMARY);
            }}
          >
            <Sparkles aria-hidden /> Start fra et eksempel
          </Button>
          <Button
            variant="ghost"
            className="min-h-11"
            onClick={() => {
              load([]);
              goTo(0);
            }}
          >
            <RotateCcw aria-hidden /> Tøm
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="min-w-0 space-y-5" aria-labelledby="step-title">
          <Progress step={step} />
          <PcDiagram states={states} current={current?.category} onSelect={goToCategory} className="h-[230px] lg:hidden" scale={0.66} />

          {current ? (
            <PartStep
              key={current.category}
              step={step}
              def={current}
              catalog={catalog}
              items={items}
              report={report}
              headingRef={headingRef}
              onPick={(item, fits) => {
                pick(item);
                if (fits && !MULTI.includes(item.category)) goTo(step + 1);
              }}
              onRemove={remove}
              onReplace={replace}
              onAdd={add}
              onBrowse={goToCategory}
              onBack={() => goTo(step - 1)}
              onNext={() => goTo(step + 1)}
            />
          ) : (
            <section className="space-y-5" data-testid="build-summary">
              <h2 id="step-title" ref={headingRef} tabIndex={-1} className="text-2xl font-semibold outline-none">
                Oppsummering
              </h2>
              <FitStamp report={report} totalRules={RULES.length} />
              <ProblemList report={report} catalog={catalog} onReplace={replace} onAdd={add} onRemove={remove} onBrowse={goToCategory} />
              <ul className="divide-y rounded-xl border bg-card" aria-label="Delene dine">
                {STEPS.flatMap((s) => {
                  const chosen = items.filter((i) => i.category === s.category);
                  if (!chosen.length) return [];
                  return chosen.map((i) => {
                    const c = idx.get(i.componentId);
                    return (
                      <li key={i.componentId} className="flex flex-wrap items-center gap-3 p-3">
                        <CategoryIcon category={s.category} className="size-5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1 basis-48">
                          <p className="text-xs text-muted-foreground">{CATEGORY_LABEL[s.category]}</p>
                          <p className="font-medium">{c?.name ?? i.componentId}</p>
                        </div>
                        <p className="font-semibold tabular-nums">{formatNok(c?.priceNok ?? 0)}</p>
                        <Button variant="outline" size="sm" className="min-h-10" onClick={() => goToCategory(s.category)} aria-label={`Endre ${CATEGORY_LABEL[s.category].toLowerCase()}`}>
                          Endre
                        </Button>
                      </li>
                    );
                  });
                })}
              </ul>
              <ChecklistView items={report.checklist} catalog={catalog} onAdd={add} />
              <PowerMeter power={report.power} />
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Totalt</p>
                  <p className="font-heading text-3xl font-semibold tabular-nums">{formatNok(report.totalNok)}</p>
                </div>
                <Button
                  className="min-h-12 rounded-full px-6"
                  disabled={!items.length}
                  onClick={() => {
                    setPackage({ items, tier: "CUSTOM" });
                    router.push("/handlekurv");
                  }}
                >
                  <ShoppingBag aria-hidden /> Legg i handlekurven
                </Button>
              </div>
              <Button variant="ghost" className="min-h-11" onClick={() => goTo(SUMMARY - 1)}>
                <ArrowLeft aria-hidden /> Tilbake
              </Button>
            </section>
          )}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start" aria-label="PC-en din">
          <div className="hidden overflow-hidden rounded-2xl border bg-card lg:block">
            <PcDiagram states={states} current={current?.category} onSelect={goToCategory} scale={0.92} />
          </div>
          <nav aria-label="Steg" className="rounded-2xl border bg-card p-2">
            <ol>
              {STEPS.map((s, n) => {
                const chosen = items.filter((i) => i.category === s.category);
                const state = states[s.category];
                const note = !chosen.length ? report.checklist.find((c) => c.category === s.category && c.status === "OK")?.message : undefined;
                return (
                  <li key={s.category}>
                    <button
                      type="button"
                      onClick={() => goTo(n)}
                      aria-current={step === n ? "step" : undefined}
                      className={cn(
                        "flex min-h-11 w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-sm hover:bg-muted",
                        step === n && "bg-secondary",
                      )}
                    >
                      {state === "error" ? (
                        <XCircle aria-label="passer ikke" className="size-4 shrink-0 text-err" />
                      ) : chosen.length ? (
                        <CheckCircle2 aria-label="valgt" className="size-4 shrink-0 text-primary" />
                      ) : (
                        <Circle aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{CATEGORY_LABEL[s.category]}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {chosen.length ? chosen.map((i) => idx.get(i.componentId)?.name ?? i.componentId).join(", ") : (note ?? "Ikke valgt")}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
              <li>
                <button
                  type="button"
                  onClick={() => goTo(SUMMARY)}
                  aria-current={step === SUMMARY ? "step" : undefined}
                  className={cn("flex min-h-11 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-sm font-medium hover:bg-muted", step === SUMMARY && "bg-secondary")}
                >
                  <ListChecks aria-hidden className="size-4 shrink-0" /> Oppsummering
                </button>
              </li>
            </ol>
          </nav>
          <div className="rounded-2xl border bg-card p-4" aria-live="polite" data-testid="build-status">
            <p className="text-sm text-muted-foreground">Totalt</p>
            <p className="font-heading text-2xl font-semibold tabular-nums">{formatNok(report.totalNok)}</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm">
              {errorCount > 0 ? (
                <>
                  <XCircle aria-hidden className="size-4 text-err" /> {errorCount === 1 ? "1 ting passer ikke" : `${errorCount} ting passer ikke`}
                </>
              ) : report.ok ? (
                <>
                  <CheckCircle2 aria-hidden className="size-4 text-ok" /> Alt passer sammen
                </>
              ) : (
                <>
                  <Circle aria-hidden className="size-4 text-muted-foreground" /> Alt passer så langt · {missing} {missing === 1 ? "del" : "deler"} gjenstår
                </>
              )}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Progress({ step }: { step: number }) {
  const label = step < SUMMARY ? `Steg ${step + 1} av ${SUMMARY}` : "Oppsummering";
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Fremdrift" aria-valuemin={0} aria-valuemax={SUMMARY} aria-valuenow={step}>
        <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${(step / SUMMARY) * 100}%` }} />
      </div>
    </div>
  );
}

function PartStep({
  step,
  def,
  catalog,
  items,
  report,
  headingRef,
  onPick,
  onRemove,
  onReplace,
  onAdd,
  onBrowse,
  onBack,
  onNext,
}: {
  step: number;
  def: (typeof STEPS)[number];
  catalog: Catalog;
  items: BuildItem[];
  report: ValidationReport;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onPick: (item: BuildItem, fits: boolean) => void;
  onRemove: (id: string) => void;
  onReplace: (oldId: string, item: BuildItem) => void;
  onAdd: (item: BuildItem) => void;
  onBrowse: (category: Category) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const expert = useExpert();
  const [sort, setSort] = useState<Sort>("recommended");
  const [shown, setShown] = useState(PAGE_SIZE);
  const { category } = def;
  const multi = MULTI.includes(category);
  const idx = catalogIndex(catalog);
  const chosen = items.filter((i) => i.category === category);
  const currentId = multi ? undefined : chosen[0]?.componentId;

  const alt = compatibleAlternatives(items, category, catalog, { replaceComponentId: currentId ?? "__none__" });
  const chosenIds = new Set(chosen.map((i) => i.componentId));
  const fits = alt.compatible
    .filter((c) => !chosenIds.has(c.component.id))
    .sort((a, b) => {
      if (sort === "price") return a.component.priceNok - b.component.priceNok;
      if (sort === "perf") return (perfValue(b.component) ?? 0) - (perfValue(a.component) ?? 0) || a.component.priceNok - b.component.priceNok;
      return 0;
    });
  const noFit = alt.incompatible.filter((c) => !chosenIds.has(c.component.id));
  const hasErrors = report.results.some((r) => !r.passed && r.severity === "ERROR");
  const okNote = !chosen.length ? report.checklist.find((c) => c.category === category && c.status === "OK")?.message : undefined;
  const missingNote = report.checklist.find((c) => c.category === category && c.status === "MISSING")?.message;
  const summary = (c: Component) => (expert ? specSummary(c) : c.plainSummary);

  return (
    <div className="space-y-5">
      <div>
        <h2 id="step-title" ref={headingRef} tabIndex={-1} className="flex items-center gap-2.5 text-2xl font-semibold outline-none">
          <CategoryIcon category={category} className="size-6 text-primary" /> {def.title}
        </h2>
        <p className="mt-1 max-w-prose text-muted-foreground">{def.intro}</p>
        {okNote && (
          <p className="mt-3 flex items-center gap-2 rounded-xl border border-ok/40 bg-ok-soft px-3 py-2 text-sm">
            <CheckCircle2 aria-hidden className="size-4 shrink-0 text-ok" /> {okNote} Du kan hoppe over dette steget.
          </p>
        )}
        {chosen.length > 0 && missingNote && (
          <p className="mt-3 flex items-center gap-2 text-sm">
            <SeverityIcon severity="WARNING" /> {missingNote}
          </p>
        )}
      </div>

      {hasErrors && (
        <div className="rounded-2xl border-2 border-err/60 bg-err-soft/40 p-4">
          <p className="mb-3 flex items-center gap-2 font-semibold">
            <XCircle aria-hidden className="size-5 text-err" /> Dette må fikses før du kan bestille
          </p>
          <ProblemList report={report} catalog={catalog} onReplace={onReplace} onAdd={onAdd} onRemove={onRemove} onBrowse={onBrowse} />
        </div>
      )}

      {chosen.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{multi ? "Lagt til" : "Ditt valg"}</p>
          <ul className="space-y-2">
            {chosen.map((i) => {
              const c = idx.get(i.componentId);
              if (!c) return null;
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-foreground bg-card p-3" data-testid="builder-chosen" data-id={c.id}>
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-muted-foreground">{summary(c)}</p>
                  </div>
                  <p className="font-semibold tabular-nums">{formatNok(c.priceNok)}</p>
                  <Button variant="outline" className="min-h-11" onClick={() => onRemove(c.id)} aria-label={`Fjern ${c.name}`}>
                    Fjern
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium" aria-live="polite">
            {chosen.length && !multi ? `Andre som passer (${fits.length})` : `Passer med det du har valgt (${fits.length})`}
          </p>
          <div role="group" aria-label="Sortering" className="flex rounded-full border bg-card p-0.5 text-sm">
            {SORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={sort === s.id}
                onClick={() => setSort(s.id)}
                className={cn("min-h-9 rounded-full px-3", sort === s.id ? "bg-foreground text-background" : "hover:bg-muted")}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <ul className="space-y-2" data-testid="builder-list">
          {fits.length === 0 && (
            <li className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Ingen andre deler i denne kategorien passer med det du har valgt.</li>
          )}
          {fits.slice(0, shown).map((alt) => {
            const c = alt.component;
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 transition hover:shadow-sm" data-testid="builder-row" data-id={c.id} data-fits="true">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-muted-foreground">{summary(c)}</p>
                  {alt.warnings.map((w, n) => (
                    <p key={n} className="mt-1 flex gap-1.5 text-xs">
                      <SeverityIcon severity="WARNING" className="mt-0.5 size-3.5" /> {w.messagePlain}
                    </p>
                  ))}
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">{formatNok(c.priceNok)}</p>
                  <p className="text-xs text-muted-foreground">{currentId ? deltaText(alt, category) : STOCK_LABEL[c.stock]}</p>
                </div>
                <Button variant="outline" className="min-h-11 min-w-24 border-foreground font-semibold" onClick={() => onPick({ category, componentId: c.id, qty: 1 }, true)} aria-label={`${multi ? "Legg til" : "Velg"} ${c.name}`}>
                  {multi ? "Legg til" : "Velg"}
                </Button>
              </li>
            );
          })}
        </ul>
        {fits.length > shown && (
          <Button variant="ghost" className="min-h-11 w-full" onClick={() => setShown((n) => n + PAGE_SIZE)}>
            Vis flere ({fits.length - shown})
          </Button>
        )}

        {noFit.length > 0 && (
          <details className="rounded-xl border bg-muted/40 p-3" data-testid="builder-nofit">
            <summary className="flex min-h-9 cursor-pointer items-center text-sm font-medium">Passer ikke med det du har valgt ({noFit.length})</summary>
            <ul className="mt-2 divide-y">
              {noFit.map((x) => (
                <li key={x.component.id} className="flex flex-wrap items-center gap-3 py-2.5" data-testid="builder-row" data-id={x.component.id} data-fits="false">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="text-sm font-medium">{x.component.name}</p>
                    <p className="mt-0.5 flex gap-1.5 text-xs">
                      <XCircle aria-hidden className="size-3.5 shrink-0 text-err" /> Passer ikke: {x.reasons[0]}
                    </p>
                  </div>
                  <p className="text-sm tabular-nums">{formatNok(x.component.priceNok)}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-10"
                    disabled={x.component.stock === "OUT"}
                    onClick={() => onPick({ category, componentId: x.component.id, qty: 1 }, false)}
                    aria-label={`Velg likevel ${x.component.name}`}
                  >
                    {x.component.stock === "OUT" ? "Utsolgt" : "Velg likevel"}
                  </Button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <Button variant="ghost" className="min-h-11" onClick={onBack} disabled={step === 0}>
          <ArrowLeft aria-hidden /> Tilbake
        </Button>
        <Button variant={chosen.length ? "default" : "outline"} className="min-h-11 rounded-full px-5" onClick={onNext}>
          {chosen.length ? (
            <>
              {step + 1 < SUMMARY ? `Neste: ${CATEGORY_LABEL[STEPS[step + 1].category]}` : "Se oppsummering"} <ArrowRight aria-hidden />
            </>
          ) : (
            <>
              Hopp over <ArrowRight aria-hidden />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/** How each part of the see-through PC is drawn: picked, broken, not needed or still empty. */
function partStates(items: BuildItem[], report: ValidationReport, catalog: Catalog): Partial<Record<Category, PartState>> {
  const idx = catalogIndex(catalog);
  const broken = new Set<Category>();
  for (const r of report.results) {
    if (r.passed || r.severity !== "ERROR") continue;
    for (const id of r.involved) {
      const c = idx.get(id);
      if (c && items.some((i) => i.componentId === id)) broken.add(c.category);
    }
  }
  const out: Partial<Record<Category, PartState>> = {};
  for (const { category } of STEPS) {
    const has = items.some((i) => i.category === category);
    const ok = report.checklist.find((c) => c.category === category && c.status === "OK");
    if (broken.has(category)) out[category] = "error";
    else if (has) out[category] = "filled";
    // A boxed cooler is physically there; a GPU the CPU does not need is simply left out.
    else if (ok && category === "COOLER") out[category] = "filled";
    else if (ok) out[category] = "skipped";
    else out[category] = "empty";
  }
  return out;
}
