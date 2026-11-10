import "server-only";
// DP2 — ProductSource backed by Postgres via Prisma. Rows are re-validated with
// Zod so the engine never receives malformed specs.
import { db } from "@/lib/db";
import type { Component as ComponentRow } from "@/lib/generated/prisma/client";
import { ComponentSchema, type Category, type Component } from "../engine/types";
import { matchesQuery, sortByCategoryThenPrice, type ProductSource, type SearchQuery } from "./source";

function toComponent(row: ComponentRow): Component {
  return ComponentSchema.parse({
    ...row,
    imageUrl: row.imageUrl ?? undefined,
    tierLabel: row.tierLabel ?? undefined,
  });
}

export const prismaSource: ProductSource = {
  name: "prisma",
  async listAll() {
    const rows = await db.component.findMany({ orderBy: [{ category: "asc" }, { priceNok: "asc" }] });
    return rows.map(toComponent);
  },
  async listByCategory(category: Category) {
    const rows = await db.component.findMany({ where: { category }, orderBy: { priceNok: "asc" } });
    return rows.map(toComponent);
  },
  async getById(id: string) {
    const row = await db.component.findUnique({ where: { id } });
    return row ? toComponent(row) : null;
  },
  async search(query: SearchQuery) {
    // Narrow in SQL on indexed columns; text matching is done in memory (catalog is small).
    const rows = await db.component.findMany({
      where: {
        category: query.category,
        priceNok: { lte: query.maxPrice, gte: query.minPrice },
        stock: query.stock?.length ? { in: query.stock } : undefined,
      },
    });
    return rows.map(toComponent).filter((c) => matchesQuery(c, query)).sort(sortByCategoryThenPrice);
  },
};
