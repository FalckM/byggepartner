"use client";
// DP1–DP4, US-03..09, US-13, US-15, US-17 — Three packages, parts in plain words, swap, FPS, power.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Link2, PencilLine, ShoppingBag, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AskBuilder } from "@/components/shop/ask-builder";
import { CompatMap } from "@/components/shop/compat-map";
import { FitChip, FitStamp } from "@/components/shop/fit-status";
import { FpsPanel } from "@/components/shop/fps-panel";
import { PartsList } from "@/components/shop/parts-list";
import { PowerMeter } from "@/components/shop/power-meter";
import { SwapSheet } from "@/components/shop/swap-sheet";
import { track } from "@/lib/analytics/track";
import { useCart, type CartTier } from "@/lib/client/cart-store";
import { catalogIndex } from "@/lib/engine/context";
import { explainComponent } from "@/lib/engine/explain";
import { formatDays, formatNok } from "@/lib/engine/labels";
import { estimateFps, GENERIC_GAME } from "@/lib/engine/performance";
import { RULES } from "@/lib/engine/rules";
import type { BuildItem, Catalog, Category, ComponentOf, Game, NeedsProfile } from "@/lib/engine/types";
import { validate } from "@/lib/engine/validate";
import { cn } from "@/lib/utils";

type Tier = "SAVE" | "RECOMMENDED" | "PERFORMANCE" | "SAVED";
interface PackageLite {
  tier: "SAVE" | "RECOMMENDED" | "PERFORMANCE";
  items: BuildItem[];
  explanations: Record<string, string>;
  score: number;
}

const TIER_NAME: Record<Tier, string> = { SAVE: "Spar", RECOMMENDED: "Anbefalt", PERFORMANCE: "Ytelse", SAVED: "Lagret pakke" };
const TIER_HINT: Record<Tier, string> = {
  SAVE: "Mest for pengene",
  RECOMMENDED: "Best balanse for deg",
  PERFORMANCE: "Litt over budsjett, merkbart raskere",
  SAVED: "Pakken fra lenken du åpnet",
};
const USE_LABEL: Record<string, string> = {
  GAMING: "spill",
  STUDY: "studier",
  STREAMING: "streaming",
  VIDEO_EDIT: "redigering",
  PROGRAMMING: "programmering",
  "3D": "3D",
};

const sameItems = (a: BuildItem[], b: BuildItem[]) =>
  a.length === b.length && a.every((x) => b.some((y) => y.componentId === x.componentId && (y.qty ?? 1) === (x.qty ?? 1)));

export function ResultView({
  buildId,
  savedTier,
  savedItems,
  needs,
  packages,
  catalog,
  games,
}: {
  buildId: string;
  savedTier: string;
  savedItems: BuildItem[];
  needs?: NeedsProfile;
  packages: PackageLite[];
  catalog: Catalog;
  games: Game[];
}) {
  const router = useRouter();
  const setPackage = useCart((s) => s.setPackage);
  const idx = useMemo(() => catalogIndex(catalog), [catalog]);

  const matching = packages.find((p) => sameItems(p.items, savedItems));
  const initialTiers = useMemo(() => {
    const m: Partial<Record<Tier, BuildItem[]>> = {};
    for (const p of packages) m[p.tier] = p.items;
    if (!matching) m.SAVED = savedItems;
    return m;
  }, [packages, matching, savedItems]);
  const [tierItems, setTierItems] = useState(initialTiers);
  const [edited, setEdited] = useState<Partial<Record<Tier, boolean>>>({});
  const [tier, setTier] = useState<Tier>(matching?.tier ?? (packages.length && savedTier !== "CUSTOM" ? "RECOMMENDED" : "SAVED"));
  const [swap, setSwap] = useState<{ category: Category; id?: string } | null>(null);
  const [share, setShare] = useState<string | null>(null);

  const options = useMemo(
    () => (needs ? { includeOs: needs.includeOs, wantsWifi: !!needs.preferences.wifi, gaming: needs.uses.includes("GAMING") } : undefined),
    [needs],
  );
  const chosenGames = useMemo(() => {
    if (!needs) return [];
    const g = needs.games.map((s) => games.find((x) => x.slug === s)).filter((x): x is Game => !!x);
    return g.length ? g : needs.uses.includes("GAMING") ? [GENERIC_GAME] : [];
  }, [needs, games]);

  const items = useMemo(() => tierItems[tier] ?? [], [tierItems, tier]);
  const report = useMemo(() => validate(items, catalog, options), [items, catalog, options]);
  const fpsFor = (list: BuildItem[]) => {
    const cpu = list.map((i) => idx.get(i.componentId)).find((c) => c?.category === "CPU") as ComponentOf<"CPU"> | undefined;
    const gpu = list.map((i) => idx.get(i.componentId)).find((c) => c?.category === "GPU") as ComponentOf<"GPU"> | undefined;
    return cpu && needs ? chosenGames.map((g) => estimateFps(g, needs.resolution, needs.targetHz, cpu, gpu)) : [];
  };
  const fps = useMemo(() => fpsFor(items), [items]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    track("package_viewed", { buildId, tiers: Object.keys(initialTiers) });
  }, [buildId, initialTiers]);
  useEffect(() => {
    if (!report.ok) track("validation_error_shown", { where: "package", rules: report.results.filter((r) => !r.passed && r.severity === "ERROR").map((r) => r.ruleId) });
  }, [report]);

  const explain = (id: string) => {
    const pkg = packages.find((p) => p.tier === tier);
    const fromGenerator = !edited[tier] ? pkg?.explanations[id] : undefined;
    const c = idx.get(id);
    if (fromGenerator) return fromGenerator;
    return c ? explainComponent(c, { needs, gameNames: chosenGames.filter((g) => g !== GENERIC_GAME).map((g) => g.name), power: report.power }) : "";
  };

  const deliveryDays = (list: BuildItem[]) => {
    const parts = list.filter((i) => !i.owned).map((i) => idx.get(i.componentId)).filter((c) => !!c && !(c.category === "ACCESSORY" && c.specs.kind === "ASSEMBLY_SERVICE"));
    const assembled = list.some((i) => i.componentId === "acc-assembly-service");
    return Math.max(1, ...parts.map((c) => c!.deliveryDays)) + (assembled ? 2 : 0);
  };

  function addToCart() {
    const cartTier: CartTier = tier === "SAVED" ? (savedTier as CartTier) : edited[tier] ? "CUSTOM" : tier;
    setPackage({ items, needs, tier: cartTier, sourceBuildId: buildId });
    router.push("/handlekurv");
  }

  async function shareLink() {
    const res = await fetch("/api/builds", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items, needs, tier: edited[tier] || tier === "SAVED" ? "CUSTOM" : tier }),
    });
    if (!res.ok) return setShare("Kunne ikke lage lenke – prøv igjen.");
    const { id } = await res.json();
    const url = `${window.location.origin}/pakke/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setShare(`Lenke kopiert: ${url}`);
    } catch {
      setShare(url);
    }
  }

  const tiers = (Object.keys(tierItems) as Tier[]).sort((a, b) => ["SAVE", "RECOMMENDED", "PERFORMANCE", "SAVED"].indexOf(a) - ["SAVE", "RECOMMENDED", "PERFORMANCE", "SAVED"].indexOf(b));
  const budget = needs?.budgetNok;

  return (
    <div className="space-y-8 pb-28">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">{packages.length ? "PC-ene vi har satt sammen til deg" : "Pakken din"}</h1>
          {needs && (
            <p className="mt-2 text-muted-foreground">
              Budsjett {formatNok(needs.budgetNok)} · {needs.uses.map((u) => USE_LABEL[u]).join(", ") || "generell bruk"}
              {chosenGames.length > 0 && chosenGames[0] !== GENERIC_GAME && ` · ${chosenGames.map((g) => g.name).join(", ")}`}
              {needs.uses.includes("GAMING") && ` · ${needs.resolution === "2160p" ? "4K" : needs.resolution} ${needs.targetHz} Hz`}
            </p>
          )}
        </div>
        <Link href="/veiviser" className="inline-flex min-h-11 items-center gap-2 rounded-full border bg-card px-4 text-sm font-medium hover:border-primary">
          <PencilLine aria-hidden className="size-4" /> Endre svarene
        </Link>
      </header>

      {needs?.existingParts?.some((p) => p.componentId) && (
        <UpgradeNote needs={needs} items={items} catalog={catalog} />
      )}

      {/* Tier cards */}
      <div role="radiogroup" aria-label="Velg pakke" className={cn("grid gap-4", tiers.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2")}>
        {tiers.map((t) => {
          const list = tierItems[t]!;
          const r = t === tier ? report : validate(list, catalog, options);
          const total = r.totalNok;
          const over = budget ? total - budget : 0;
          const chips = fpsFor(list).slice(0, 3);
          const selected = t === tier;
          return (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={selected}
              data-testid="tier-card"
              data-tier={t}
              onClick={() => {
                setTier(t);
                track("tier_selected", { tier: t });
              }}
              className={cn(
                "relative flex flex-col gap-3 rounded-2xl border-2 bg-card p-5 text-left transition",
                selected ? "border-primary shadow-[0_12px_40px_-18px_oklch(0.42_0.12_258/0.6)]" : "border-border hover:border-primary/50",
                t === "RECOMMENDED" && "md:-translate-y-2",
              )}
            >
              {t === "RECOMMENDED" && (
                <span className="absolute -top-3 left-5 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">Vårt forslag</span>
              )}
              <span className="flex items-center justify-between gap-2">
                <span className="font-heading text-2xl font-semibold">{TIER_NAME[t]}</span>
                {selected && (
                  <span className="grid size-6 place-items-center rounded-full bg-primary text-primary-foreground" aria-hidden>
                    <Check className="size-4" />
                  </span>
                )}
              </span>
              <span className="text-sm text-muted-foreground">{TIER_HINT[t]}{edited[t] && " · endret av deg"}</span>
              <span className="font-heading text-3xl font-semibold tabular-nums">{formatNok(total)}</span>
              {budget && (
                <span className="space-y-1">
                  <span className="block h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <span className={cn("block h-full rounded-full", over > 0 ? "bg-warn" : "bg-primary")} style={{ width: `${Math.min(100, (total / budget) * 100)}%` }} />
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {over > 0 ? `${formatNok(over)} over budsjettet ditt` : `${Math.round((total / budget) * 100)} % av budsjettet`}
                  </span>
                </span>
              )}
              <FitChip report={r} className="self-start" />
              {chips.length > 0 && (
                <span className="flex flex-wrap gap-1.5">
                  {chips.map((f) => (
                    <span key={f.game} className="rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                      {f.gameName} <strong className="tabular-nums">{f.low}–{f.high} fps</strong>
                    </span>
                  ))}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Truck aria-hidden className="size-3.5" /> Klar til levering om {formatDays(deliveryDays(list))}
              </span>
            </button>
          );
        })}
      </div>
      {packages.length > 0 && packages.length < 3 && (
        <p className="text-sm text-muted-foreground">
          {!packages.some((p) => p.tier === "PERFORMANCE") && "Vi fant ingen pakke som er merkbart raskere innenfor 10 % over budsjett – «Anbefalt» er allerede det beste for pengene. "}
          {!packages.some((p) => p.tier === "SAVE") && "Budsjettet er så stramt at vi ikke fant en billigere komplett PC."}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section aria-labelledby="parts-title" className="space-y-3">
          <h2 id="parts-title" className="text-xl font-semibold">
            Dette får du i «{TIER_NAME[tier]}»
          </h2>
          <PartsList
            items={items}
            catalog={catalog}
            explain={explain}
            onSwap={(category, id) => {
              setSwap({ category, id });
              track("part_swap_opened", { category, componentId: id });
            }}
            highlight={new Set(report.results.filter((r) => !r.passed && r.severity === "ERROR").flatMap((r) => r.involved))}
          />
          <details className="group rounded-xl border bg-card p-4" data-testid="map-details">
            <summary className="cursor-pointer text-lg font-semibold">Se hvordan delene henger sammen</summary>
            <div className="mt-4">
              <CompatMap items={items} catalog={catalog} report={report} />
            </div>
          </details>
        </section>
        <aside className="space-y-4">
          <FitStamp report={report} totalRules={RULES.length} />
          <FpsPanel fps={fps} targetHz={needs?.targetHz ?? 60} />
          <PowerMeter power={report.power} />
          <div className="space-y-2 rounded-xl border bg-card p-4">
            <AskBuilder items={items} catalog={catalog} report={report} needs={needs} />
            <Button variant="outline" className="min-h-11 w-full" onClick={shareLink}>
              <Link2 aria-hidden /> Del eller lagre pakken
            </Button>
            {share && (
              <p className="mt-2 text-sm break-all" role="status">
                {share}
              </p>
            )}
          </div>
        </aside>
      </div>

      <SwapSheet
        open={!!swap}
        onOpenChange={(o) => !o && setSwap(null)}
        items={items}
        category={swap?.category ?? null}
        replaceId={swap?.id}
        catalog={catalog}
        options={options}
        onSwap={(item) => {
          const next = swap?.id ? items.map((i) => (i.componentId === swap.id ? item : i)) : [...items, item];
          setTierItems({ ...tierItems, [tier]: next });
          setEdited({ ...edited, [tier]: true });
          track("part_swapped", { from: swap?.id, to: item.componentId, category: item.category });
          setSwap(null);
        }}
      />

      {/* Sticky bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{TIER_NAME[tier]}</p>
            <p className="font-heading text-2xl font-semibold tabular-nums" data-testid="sticky-total">
              {formatNok(report.totalNok)}
            </p>
          </div>
          <Button size="lg" className="ml-auto min-h-12 px-5 text-base" onClick={addToCart} data-testid="add-to-cart">
            <ShoppingBag aria-hidden /> <span className="hidden sm:inline">Legg pakken i handlekurven</span>
            <span className="sm:hidden">Legg i handlekurv</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

/** US-18 — Upgrade mode: what is kept, and a warning if the old PSU had to be replaced. */
function UpgradeNote({ needs, items, catalog }: { needs: NeedsProfile; items: BuildItem[]; catalog: Catalog }) {
  const ownedPsuId = needs.existingParts?.find((p) => p.category === "PSU")?.componentId;
  const psuItem = items.find((i) => i.category === "PSU");
  const replacedPsu = ownedPsuId && psuItem && !psuItem.owned ? catalog.find((c) => c.id === ownedPsuId) : undefined;
  const kept = items.filter((i) => i.owned).length;
  return (
    <div className="space-y-2" data-testid="upgrade-note">
      <p className="rounded-xl border bg-secondary p-3 text-sm text-secondary-foreground">
        Oppgradering: {kept} deler du har fra før er merket «Har fra før». Vi har sjekket at de nye delene passer med dem, og du betaler bare for det nye.
      </p>
      {replacedPsu && (
        <p role="note" className="rounded-xl border-2 border-warn bg-warn-soft p-3 text-sm" data-testid="psu-warning">
          Strømforsyningen din ({replacedPsu.name}) er for svak eller mangler riktige kabler til det nye. Vi har derfor lagt inn en ny.
        </p>
      )}
    </div>
  );
}
