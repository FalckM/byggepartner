"use client";
// DP1, US-08 — Parts in plain language: what it does, why we chose it, and swap.
import { useState } from "react";
import { ArrowLeftRight, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics/track";
import { CATEGORY_LABEL_PLAIN, STOCK_LABEL, formatNok } from "@/lib/engine/labels";
import type { BuildItem, Catalog, Category } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "./category-icon";

const ORDER: Category[] = ["CPU", "GPU", "MOTHERBOARD", "RAM", "STORAGE", "COOLER", "PSU", "CASE", "OS", "ACCESSORY"];
const SWAPPABLE = new Set<Category>(["CPU", "GPU", "MOTHERBOARD", "RAM", "STORAGE", "COOLER", "PSU", "CASE", "OS"]);

export function PartsList({
  items,
  catalog,
  explain,
  onSwap,
  onRemove,
  highlight,
}: {
  items: BuildItem[];
  catalog: Catalog;
  explain: (componentId: string) => string;
  onSwap?: (category: Category, componentId: string) => void;
  onRemove?: (componentId: string) => void;
  /** Ids involved in a problem (outlined). */
  highlight?: Set<string>;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const sorted = [...items].sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category));

  return (
    <ul className="divide-y rounded-xl border bg-card" data-testid="parts-list">
      {sorted.map((item) => {
        const c = byId.get(item.componentId);
        if (!c) return null;
        const isOpen = open === c.id;
        return (
          <li key={c.id} className={cn("p-3 sm:p-4", highlight?.has(c.id) && "bg-err-soft/60")} data-testid="part-row" data-category={c.category}>
            <div className="flex gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                <CategoryIcon category={c.category} className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{CATEGORY_LABEL_PLAIN[c.category]}</p>
                <p className="font-medium" data-testid="part-name">
                  {c.name}
                  {item.qty > 1 && <span className="text-muted-foreground"> × {item.qty}</span>}
                </p>
                <p className="text-sm text-muted-foreground">{c.plainSummary}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-expanded={isOpen}
                    onClick={() => {
                      setOpen(isOpen ? null : c.id);
                      if (!isOpen) track("explanation_opened", { componentId: c.id });
                    }}
                    className="-ml-2 min-h-9"
                  >
                    Hvorfor denne? <ChevronDown aria-hidden className={cn("size-4 transition", isOpen && "rotate-180")} />
                  </Button>
                  {onSwap && SWAPPABLE.has(c.category) && !item.owned && (
                    <Button variant="ghost" size="sm" className="min-h-9" onClick={() => onSwap(c.category, c.id)} aria-label={`Bytt ${c.name}`}>
                      <ArrowLeftRight aria-hidden className="size-4" /> Bytt
                    </Button>
                  )}
                  {onRemove && !item.owned && (
                    <Button variant="ghost" size="sm" className="min-h-9 text-muted-foreground" onClick={() => onRemove(c.id)} aria-label={`Fjern ${c.name}`}>
                      <Trash2 aria-hidden className="size-4" /> Fjern
                    </Button>
                  )}
                </div>
                {isOpen && <p className="mt-1 rounded-lg bg-muted p-3 text-sm">{explain(c.id)}</p>}
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold tabular-nums">{item.owned ? "Har fra før" : formatNok(c.priceNok * (item.qty ?? 1))}</p>
                {!item.owned && <p className="text-xs text-muted-foreground">{STOCK_LABEL[c.stock]}</p>}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
