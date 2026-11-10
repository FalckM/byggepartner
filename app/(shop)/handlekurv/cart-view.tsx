"use client";
// DP3, DP4, US-05, US-06, US-12 — Point of Cause: the cart. Green stamp ONLY when validate().ok.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Hammer, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ChecklistView } from "@/components/shop/checklist-view";
import { FitStamp } from "@/components/shop/fit-status";
import { PartsList } from "@/components/shop/parts-list";
import { PowerMeter } from "@/components/shop/power-meter";
import { ProblemList } from "@/components/shop/problem-list";
import { RulesChecked } from "@/components/shop/rules-checked";
import { SwapSheet } from "@/components/shop/swap-sheet";
import { track } from "@/lib/analytics/track";
import { ASSEMBLY_ID, useCart, useCartHydrated } from "@/lib/client/cart-store";
import { catalogIndex } from "@/lib/engine/context";
import { explainComponent } from "@/lib/engine/explain";
import { formatDays, formatNok } from "@/lib/engine/labels";
import { RULES } from "@/lib/engine/rules";
import type { Catalog, Category } from "@/lib/engine/types";
import { validate } from "@/lib/engine/validate";

export function CartView({ catalog }: { catalog: Catalog }) {
  const hydrated = useCartHydrated();
  const { items, needs, addItem, removeItem, replaceItem, setAssembly } = useCart();
  const [showChecks, setShowChecks] = useState(false);
  const [browse, setBrowse] = useState<{ category: Category; id?: string } | null>(null);
  const idx = useMemo(() => catalogIndex(catalog), [catalog]);

  const options = useMemo(
    () => (needs ? { includeOs: needs.includeOs, wantsWifi: !!needs.preferences.wifi, gaming: needs.uses.includes("GAMING") } : undefined),
    [needs],
  );
  // Re-validated on EVERY change (spec 9.3) – the client engine runs in < 10 ms.
  const report = useMemo(() => validate(items, catalog, options), [items, catalog, options]);
  const assembled = items.some((i) => i.componentId === ASSEMBLY_ID);

  useEffect(() => {
    if (hydrated) track("cart_viewed", { items: items.length });
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!hydrated || !items.length) return;
    if (report.ok) track("cart_green_check_shown", {});
    else track("validation_error_shown", { where: "cart", rules: report.results.filter((r) => !r.passed && r.severity === "ERROR").map((r) => r.ruleId) });
  }, [hydrated, report.ok]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hydrated) return <p className="text-muted-foreground">Henter handlekurven …</p>;
  if (!items.length) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
        <ShoppingBag aria-hidden className="mx-auto size-10 text-muted-foreground" />
        <h1 className="text-3xl font-semibold">Handlekurven er tom</h1>
        <p className="text-muted-foreground">Svar på noen få spørsmål, så setter vi sammen en PC som passer.</p>
        <Link href="/veiviser" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground">
          Hjelp meg å velge <ArrowRight aria-hidden className="size-5" />
        </Link>
      </div>
    );
  }

  const parts = items.filter((i) => i.componentId !== ASSEMBLY_ID);
  const days = Math.max(1, ...parts.filter((i) => !i.owned).map((i) => idx.get(i.componentId)?.deliveryDays ?? 1)) + (assembled ? 2 : 0);
  const explain = (id: string) => {
    const c = idx.get(id);
    return c ? explainComponent(c, { needs, power: report.power }) : "";
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <h1 className="text-3xl font-semibold sm:text-4xl">Handlekurv</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <FitStamp report={report} totalRules={RULES.length} onShowChecks={() => setShowChecks(!showChecks)} />
          {showChecks && <RulesChecked report={report} />}
          <ProblemList
            report={report}
            catalog={catalog}
            onReplace={replaceItem}
            onAdd={addItem}
            onRemove={removeItem}
            onBrowse={(category, id) => setBrowse({ category, id })}
          />
          <ChecklistView items={report.checklist} catalog={catalog} onAdd={addItem} />
          <section aria-labelledby="cart-parts" className="space-y-3">
            <h2 id="cart-parts" className="text-xl font-semibold">
              Delene i pakken
            </h2>
            <PartsList items={parts} catalog={catalog} explain={explain} onSwap={(category, id) => setBrowse({ category, id })} onRemove={removeItem} />
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Totalt inkl. mva.</p>
            <p className="font-heading text-4xl font-semibold tabular-nums" data-testid="cart-total">
              {formatNok(report.totalNok)}
            </p>
            {needs && report.totalNok > needs.budgetNok && (
              <p className="text-sm text-muted-foreground">{formatNok(report.totalNok - needs.budgetNok)} over budsjettet ditt</p>
            )}
            <p className="mt-2 flex items-center gap-1.5 text-sm">
              <Truck aria-hidden className="size-4" /> Klar til levering om {formatDays(days)}
            </p>
            {report.ok ? (
              <Link
                href="/kasse"
                className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground"
                data-testid="to-checkout"
              >
                Gå til kassen <ArrowRight aria-hidden className="size-5" />
              </Link>
            ) : (
              <>
                <Button disabled className="mt-4 min-h-12 w-full rounded-full" data-testid="to-checkout-disabled">
                  Gå til kassen
                </Button>
                <p className="mt-2 text-sm text-muted-foreground">Fiks punktene til venstre først – da er du trygg på at PC-en starter.</p>
              </>
            )}
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border bg-card p-4">
            <Switch checked={assembled} onCheckedChange={(on) => setAssembly(on)} aria-label="Vi bygger den for deg" className="mt-1" />
            <span>
              <span className="flex items-center gap-1.5 font-medium">
                <Hammer aria-hidden className="size-4" /> Vi bygger den for deg (+999 kr)
              </span>
              <span className="block text-sm text-muted-foreground">Testet og klar til bruk. Vi oppdaterer også programvaren på hovedkortet.</span>
            </span>
          </label>

          <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-card p-4" data-testid="guarantee">
            <p className="flex items-center gap-2 font-semibold">
              <ShieldCheck aria-hidden className="size-5 text-primary" /> Kompatibilitetsgaranti
            </p>
            <p className="mt-1 text-sm">Hvis delene i denne pakken ikke passer sammen, bytter vi dem kostnadsfritt.</p>
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer font-medium underline underline-offset-4">Les vilkår (prototype)</summary>
              <p className="mt-2 text-muted-foreground">
                Garantien gjelder at delene i pakken er kompatible med hverandre slik vi har sjekket dem: at de passer fysisk, har riktige
                kontakter og nok strøm. Den dekker ikke skader som oppstår under montering, og gjelder bare pakker der sjekken viser «Alt passer
                sammen». Dette er en prototype – ingen reell garanti gis.
              </p>
            </details>
          </div>

          <PowerMeter power={report.power} />
        </aside>
      </div>

      {/* Mobile: the decision point stays in reach (H2). */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <p className="font-heading text-xl font-semibold tabular-nums">{formatNok(report.totalNok)}</p>
          {report.ok ? (
            <Link href="/kasse" className="ml-auto inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-5 font-semibold text-primary-foreground">
              Til kassen <ArrowRight aria-hidden className="size-5" />
            </Link>
          ) : (
            <span className="ml-auto text-sm text-muted-foreground">Fiks punktene over først</span>
          )}
        </div>
      </div>

      <SwapSheet
        open={!!browse}
        onOpenChange={(o) => !o && setBrowse(null)}
        items={items}
        category={browse?.category ?? null}
        replaceId={browse?.id}
        catalog={catalog}
        options={options}
        onSwap={(item) => {
          if (browse?.id) replaceItem(browse.id, item);
          else addItem(item);
          track("part_swapped", { from: browse?.id, to: item.componentId, where: "cart" });
          setBrowse(null);
        }}
      />
    </div>
  );
}
