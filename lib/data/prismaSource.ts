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
    // Incomplete imports are NEVER handed to the engine (spec 10.2) – see listIncomplete() for admin.
    const rows = await db.component.findMany({ where: { incompleteForValidation: false }, orderBy: [{ category: "asc" }, { priceNok: "asc" }] });
    return rows.map(toComponent);
  },
  async listByCategory(category: Category) {
    const rows = await db.component.findMany({ where: { category, incompleteForValidation: false }, orderBy: { priceNok: "asc" } });
    return rows.map(toComponent);
  },
  async getById(id: string) {
    const row = await db.component.findUnique({ where: { id } });
    return row && !row.incompleteForValidation ? toComponent(row) : null;
  },
  async search(query: SearchQuery) {
    // Narrow in SQL on indexed columns; text matching is done in memory (catalog is small).
    const rows = await db.component.findMany({
      where: {
        category: query.category,
        priceNok: { lte: query.maxPrice, gte: query.minPrice },
        stock: query.stock?.length ? { in: query.stock } : undefined,
        incompleteForValidation: false,
      },
    });
    return rows.map(toComponent).filter((c) => matchesQuery(c, query)).sort(sortByCategoryThenPrice);
  },
};

/** Admin only: imported rows with missing fields (not valid Components – kept out of the engine). */
export async function listIncomplete() {
  return db.component.findMany({
    where: { incompleteForValidation: true },
    orderBy: [{ source: "asc" }, { category: "asc" }, { name: "asc" }],
    select: { id: true, category: true, brand: true, name: true, priceNok: true, source: true, specs: true },
  });
}
