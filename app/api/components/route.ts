// DP2, US-07 — GET components, optionally only those compatible with a saved build (spec 12).
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { matchesQuery } from "@/lib/data/source";
import { compatibleAlternatives } from "@/lib/engine/alternatives";
import { BuildItemSchema, CategorySchema } from "@/lib/engine/types";
import { getCatalog } from "@/lib/server/catalog";

const Query = z.object({
  category: CategorySchema.optional(),
  compatibleWith: z.string().max(32).optional(),
  maxPrice: z.coerce.number().int().positive().optional(),
  q: z.string().max(100).optional(),
});

export async function GET(req: NextRequest) {
  const parsed = Query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return Response.json({ error: "Valideringsfeil", fields: z.flattenError(parsed.error).fieldErrors }, { status: 400 });
  const { category, compatibleWith, maxPrice, q } = parsed.data;
  const catalog = await getCatalog();
  const filter = (c: (typeof catalog)[number]) => matchesQuery(c, { category, maxPrice, q });

  if (!compatibleWith) return Response.json({ compatible: catalog.filter(filter), incompatible: [] });
  if (!category) return Response.json({ error: "compatibleWith krever category" }, { status: 400 });
  const build = await db.build.findUnique({ where: { id: compatibleWith } });
  if (!build) return Response.json({ error: "Fant ikke pakken" }, { status: 404 });
  const items = z.array(BuildItemSchema).parse(build.items);
  const { compatible, incompatible } = compatibleAlternatives(items, category, catalog);
  return Response.json({
    compatible: compatible.filter((c) => filter(c.component)),
    incompatible: incompatible.filter((c) => filter(c.component)).map((c) => ({ component: c.component, reasons: c.reasons })),
  });
}
