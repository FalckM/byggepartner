"use client";
// DP3, US-05, RESP-06 — «Ingenting mangler» checklist with «Legg til anbefalt».
import { AlertTriangle, CheckCircle2, Plus, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics/track";
import { catalogIndex } from "@/lib/engine/context";
import { formatNok } from "@/lib/engine/labels";
import type { ChecklistItem } from "@/lib/engine/report";
import type { BuildItem, Catalog } from "@/lib/engine/types";

const ICON = {
  OK: <CheckCircle2 aria-hidden className="size-5 shrink-0 text-ok" />,
  WARN: <AlertTriangle aria-hidden className="size-5 shrink-0 text-warn" />,
  MISSING: <XCircle aria-hidden className="size-5 shrink-0 text-err" />,
};
const SR = { OK: "Med", WARN: "Merk", MISSING: "Mangler" };

export function ChecklistView({ items, catalog, onAdd }: { items: ChecklistItem[]; catalog: Catalog; onAdd: (item: BuildItem) => void }) {
  const idx = catalogIndex(catalog);
  return (
    <section aria-labelledby="checklist-title" className="rounded-xl border bg-card p-4">
      <h2 id="checklist-title" className="text-lg font-semibold">
        Sjekkliste – ingenting mangler
      </h2>
      <ul className="mt-3 space-y-2.5" data-testid="checklist">
        {items.map((i) => {
          const rec = i.recommendedIds?.[0] ? idx.get(i.recommendedIds[0]) : undefined;
          return (
            <li key={i.key} className="flex gap-2.5" data-testid="checklist-item" data-key={i.key} data-status={i.status}>
              {ICON[i.status]}
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  <span className="sr-only">{SR[i.status]}: </span>
                  {i.label}
                </p>
                <p className="text-sm text-muted-foreground">{i.message}</p>
                {i.status === "MISSING" && rec && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-1.5 min-h-10"
                    onClick={() => {
                      track("checklist_fix_clicked", { key: i.key, add: rec.id });
                      onAdd({ category: rec.category, componentId: rec.id, qty: 1 });
                    }}
                  >
                    <Plus aria-hidden /> Legg til anbefalt: {rec.name} ({formatNok(rec.priceNok)})
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
