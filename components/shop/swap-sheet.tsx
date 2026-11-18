"use client";
// DP2, US-07 — Swap a part: only compatible alternatives can be chosen; the rest are listed with a reason.
import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { compatibleAlternatives } from "@/lib/engine/alternatives";
import { CATEGORY_LABEL_PLAIN, STOCK_LABEL, formatNok } from "@/lib/engine/labels";
import type { AlternativeCandidate, ValidateOptions } from "@/lib/engine/report";
import type { BuildItem, Catalog, Category } from "@/lib/engine/types";
import { CategoryIcon } from "./category-icon";
import { SeverityIcon } from "./fit-status";

const PERF_CATEGORIES: Category[] = ["CPU", "GPU", "RAM", "STORAGE"];

export function deltaText(c: AlternativeCandidate, category: Category): string {
  const price = c.priceDeltaNok === 0 ? "samme pris" : `${c.priceDeltaNok > 0 ? "+" : "−"}${formatNok(Math.abs(c.priceDeltaNok))}`;
  if (!PERF_CATEGORIES.includes(category)) return price;
  const unit = category === "RAM" || category === "STORAGE" ? "plass" : "ytelse";
  const perf = c.perfDeltaPct === 0 ? `samme ${unit}` : `${c.perfDeltaPct > 0 ? "+" : "−"}${Math.abs(c.perfDeltaPct)} % ${unit}`;
  return `${price} · ${perf}`;
}

export function SwapSheet({
  open,
  onOpenChange,
  items,
  category,
  replaceId,
  catalog,
  options,
  onSwap,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: BuildItem[];
  category: Category | null;
  replaceId?: string;
  catalog: Catalog;
  options?: ValidateOptions;
  onSwap: (item: BuildItem) => void;
}) {
  const result = useMemo(
    () => (open && category ? compatibleAlternatives(items, category, catalog, { replaceComponentId: replaceId, validateOptions: options }) : null),
    [open, category, items, catalog, replaceId, options],
  );
  const current = replaceId ? catalog.find((c) => c.id === replaceId) : undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        {category && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 font-heading text-xl">
                <CategoryIcon category={category} className="size-5" /> Bytt {CATEGORY_LABEL_PLAIN[category].toLowerCase()}
              </SheetTitle>
              <SheetDescription>
                Du kan ikke velge noe som ikke passer – vi har allerede sjekket alt mot resten av pakken.
                {current && <> Nå: <strong>{current.name}</strong>.</>}
              </SheetDescription>
            </SheetHeader>
            <ul className="space-y-2 px-4" data-testid="swap-list">
              {result?.compatible.map((c) => (
                <li key={c.component.id}>
                  <button
                    type="button"
                    onClick={() => onSwap({ category, componentId: c.component.id, qty: 1 })}
                    className="group flex w-full items-start gap-3 rounded-xl border bg-card p-3 text-left transition hover:shadow-sm"
                    data-testid="swap-option"
                    data-id={c.component.id}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{c.component.name}</span>
                      <span className="block text-sm text-muted-foreground">{c.component.plainSummary}</span>
                      <span className="mt-1 block text-sm font-medium tabular-nums">{deltaText(c, category)}</span>
                      {c.warnings.map((w, i) => (
                        <span key={i} className="mt-1 flex gap-1.5 text-xs">
                          <SeverityIcon severity="WARNING" className="mt-0.5 size-3.5" /> {w.messagePlain}
                        </span>
                      ))}
                      {c.component.stock !== "IN_STOCK" && (
                        <span className="mt-1 block text-xs text-muted-foreground">{STOCK_LABEL[c.component.stock]}</span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 self-center text-sm font-medium text-primary">
                      Velg <ChevronRight aria-hidden className="size-4 transition group-hover:translate-x-0.5" />
                    </span>
                  </button>
                </li>
              ))}
              {result && result.compatible.length === 0 && (
                <li className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  Ingen andre deler i denne kategorien passer med resten av pakken.
                </li>
              )}
            </ul>
            {result && result.incompatible.length > 0 && (
              <details className="mx-4 mb-6 rounded-xl border bg-muted/40 p-3">
                <summary className="cursor-pointer text-sm font-medium">Passer ikke ({result.incompatible.length})</summary>
                <ul className="mt-2 space-y-2 text-sm">
                  {result.incompatible.map((c) => (
                    <li key={c.component.id}>
                      <span className="block">{c.component.name}</span>
                      <span className="flex gap-1.5 text-xs text-muted-foreground">
                        <SeverityIcon severity="ERROR" className="mt-0.5 size-3.5" /> {c.reasons[0]}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <div className="px-4 pb-6">
              <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                Behold det jeg har
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
