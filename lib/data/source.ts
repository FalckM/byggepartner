// DP2 — ProductSource adapter (chapter 5). The engine only ever sees a Catalog;
// where the products come from (seed JSON, Postgres, a future Multicom API) is
// hidden behind this interface.
import type { Category, Component, Stock } from "../engine/types";

export interface SearchQuery {
  q?: string;
  category?: Category;
  stock?: Stock[];
  maxPrice?: number;
  minPrice?: number;
  /** Exclude components missing data needed for validation (imports). Default true. */
  validatedOnly?: boolean;
}

export interface ProductSource {
  readonly name: string;
  listAll(): Promise<Component[]>;
  listByCategory(category: Category): Promise<Component[]>;
  getById(id: string): Promise<Component | null>;
  search(query: SearchQuery): Promise<Component[]>;
}

/** Pure in-memory filter shared by all sources (and the admin catalog UI). */
export function matchesQuery(c: Component, query: SearchQuery): boolean {
  if (query.category && c.category !== query.category) return false;
  if (query.stock?.length && !query.stock.includes(c.stock)) return false;
  if (query.maxPrice !== undefined && c.priceNok > query.maxPrice) return false;
  if (query.minPrice !== undefined && c.priceNok < query.minPrice) return false;
  if ((query.validatedOnly ?? true) && c.incompleteForValidation) return false;
  if (query.q) {
    const haystack = `${c.id} ${c.brand} ${c.name}`.toLowerCase();
    const terms = query.q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.every((t) => haystack.includes(t))) return false;
  }
  return true;
}

export function sortByCategoryThenPrice(a: Component, b: Component): number {
  return a.category === b.category ? a.priceNok - b.priceNok : a.category.localeCompare(b.category);
}
