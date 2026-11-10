"use client";

import { Fragment, useDeferredValue, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { specSummary } from "@/lib/catalog/specSummary";
import { matchesQuery } from "@/lib/data/source";
import { CATEGORY_LABEL, STOCK_LABEL, formatNok } from "@/lib/engine/labels";
import { CATEGORIES, type Category, type Component, type Stock } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

type SortKey = "category" | "price-asc" | "price-desc" | "name";

const STOCK_STYLE: Record<Stock, string> = {
  IN_STOCK: "bg-ok-soft text-foreground",
  LOW: "bg-warn-soft text-foreground",
  ORDER: "bg-muted text-foreground",
  OUT: "bg-err-soft text-foreground",
};

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring";

export function CatalogTable({
  components,
  initialCategory,
}: {
  components: Component[];
  initialCategory: Category | "ALL";
}) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<Category | "ALL">(initialCategory);
  const [stock, setStock] = useState<Stock | "ALL">("ALL");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<SortKey>("category");
  const [open, setOpen] = useState<string | null>(null);
  const deferredQ = useDeferredValue(q);

  const counts = useMemo(() => {
    const m = new Map<Category, number>();
    for (const c of components) m.set(c.category, (m.get(c.category) ?? 0) + 1);
    return m;
  }, [components]);

  const rows = useMemo(() => {
    const max = Number.parseInt(maxPrice, 10);
    const filtered = components.filter((c) =>
      matchesQuery(c, {
        q: deferredQ || undefined,
        category: category === "ALL" ? undefined : category,
        stock: stock === "ALL" ? undefined : [stock],
        maxPrice: Number.isFinite(max) ? max : undefined,
        validatedOnly: false,
      }),
    );
    const sorted = [...filtered];
    if (sort === "price-asc") sorted.sort((a, b) => a.priceNok - b.priceNok);
    if (sort === "price-desc") sorted.sort((a, b) => b.priceNok - a.priceNok);
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name, "nb"));
    if (sort === "category")
      sorted.sort(
        (a, b) =>
          CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || a.priceNok - b.priceNok,
      );
    return sorted;
  }, [components, deferredQ, category, stock, maxPrice, sort]);

  return (
    <div className="space-y-4">
      {/* Category chips */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Velg kategori">
        <Chip active={category === "ALL"} onClick={() => setCategory("ALL")}>
          Alle ({components.length})
        </Chip>
        {CATEGORIES.map((cat) => (
          <Chip key={cat} active={category === cat} onClick={() => setCategory(cat)}>
            {CATEGORY_LABEL[cat]} ({counts.get(cat) ?? 0})
          </Chip>
        ))}
      </div>

      {/* Filters */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="cat-q">Søk</Label>
          <div className="relative">
            <Search aria-hidden className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input
              id="cat-q"
              type="search"
              placeholder="Navn, merke eller id …"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cat-stock">Lagerstatus</Label>
          <select
            id="cat-stock"
            className={selectClass}
            value={stock}
            onChange={(e) => setStock(e.target.value as Stock | "ALL")}
          >
            <option value="ALL">Alle</option>
            {(Object.keys(STOCK_LABEL) as Stock[]).map((s) => (
              <option key={s} value={s}>
                {STOCK_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cat-max">Maks pris (kr)</Label>
          <Input
            id="cat-max"
            inputMode="numeric"
            placeholder="f.eks. 5000"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cat-sort">Sortering</Label>
          <select
            id="cat-sort"
            className={selectClass}
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <option value="category">Kategori, så pris</option>
            <option value="price-asc">Pris – lav til høy</option>
            <option value="price-desc">Pris – høy til lav</option>
            <option value="name">Navn A–Å</option>
          </select>
        </div>
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite" data-testid="result-count">
        Viser {rows.length} av {components.length} komponenter
      </p>

      <div className="overflow-x-auto rounded-lg border" tabIndex={0} role="region" aria-label="Komponenttabell">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <span className="sr-only">Detaljer</span>
              </TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Navn</TableHead>
              <TableHead className="text-right">Pris</TableHead>
              <TableHead>Lager</TableHead>
              <TableHead className="min-w-80">Nøkkeltall</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => {
              const isOpen = open === c.id;
              return (
                <Fragment key={c.id}>
                  <TableRow data-testid="catalog-row">
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? null : c.id)}
                        aria-expanded={isOpen}
                        aria-label={`${isOpen ? "Skjul" : "Vis"} detaljer for ${c.name}`}
                        className="grid size-8 place-items-center rounded-md hover:bg-muted"
                      >
                        {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      </button>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{CATEGORY_LABEL[c.category]}</TableCell>
                    <TableCell>
                      <span className="font-medium">{c.name}</span>
                      <span className="block font-mono text-xs text-muted-foreground">
                        {c.id}
                        {c.source !== "seed" && <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 font-sans text-secondary-foreground">{c.source}</span>}
                      </span>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap tabular-nums">
                      {formatNok(c.priceNok)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn("rounded-full px-2 py-0.5 text-xs whitespace-nowrap", STOCK_STYLE[c.stock])}
                      >
                        {STOCK_LABEL[c.stock]}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs whitespace-normal text-muted-foreground">
                      {specSummary(c)}
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/40 whitespace-normal">
                        <p className="mb-2 text-sm">{c.plainSummary}</p>
                        <pre className="overflow-x-auto rounded-md bg-background p-3 text-xs">
                          {JSON.stringify({ ...c, plainSummary: undefined }, null, 2)}
                        </pre>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Ingen komponenter matcher filtrene.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-9 rounded-full border px-3 text-sm",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
