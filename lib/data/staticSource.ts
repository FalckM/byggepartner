// DP2, US-11 — ProductSource backed by the seed JSON. Used in tests (no DB needed).
import type { Category, Component } from "../engine/types";
import { loadSeedCatalog } from "./seedData";
import { matchesQuery, type ProductSource, type SearchQuery } from "./source";

export function createStaticSource(catalog: Component[] = loadSeedCatalog()): ProductSource {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  return {
    name: "static",
    listAll: async () => [...catalog],
    listByCategory: async (category: Category) => catalog.filter((c) => c.category === category),
    getById: async (id: string) => byId.get(id) ?? null,
    search: async (query: SearchQuery) => catalog.filter((c) => matchesQuery(c, query)),
  };
}
