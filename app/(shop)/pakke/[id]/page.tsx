import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { db } from "@/lib/db";
import { generate } from "@/lib/engine/generate";
import { BuildItemSchema, CategorySchema, NeedsProfileSchema } from "@/lib/engine/types";
import { getCatalog, getGames } from "@/lib/server/catalog";
import { ResultView } from "./result-view";

export const metadata: Metadata = { title: "Dine PC-er" };

export default function PackagePage({ params }: PageProps<"/pakke/[id]">) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Suspense fallback={<p className="py-20 text-center text-muted-foreground">Setter sammen og sjekker PC-ene dine …</p>}>
        <Loader params={params} />
      </Suspense>
    </main>
  );
}

async function Loader({ params }: Pick<PageProps<"/pakke/[id]">, "params">) {
  await connection();
  const { id } = await params;
  const build = await db.build.findUnique({ where: { id } });
  if (!build) notFound();
  const [catalog, games] = await Promise.all([getCatalog(), getGames()]);
  const needs = NeedsProfileSchema.safeParse(build.needs);
  const upgradeCategories = z.object({ upgradeCategories: z.array(CategorySchema).optional() }).safeParse(build.needs);
  const items = z.array(BuildItemSchema).parse(build.items);
  const generated = needs.success
    ? generate(needs.data, catalog, games, { upgradeCategories: upgradeCategories.success ? upgradeCategories.data.upgradeCategories : undefined })
    : null;
  return (
    <ResultView
      buildId={build.id}
      savedTier={build.tier}
      savedItems={items}
      needs={needs.success ? needs.data : undefined}
      packages={generated?.ok ? generated.packages.map(({ tier, items, explanations, score }) => ({ tier, items, explanations, score })) : []}
      catalog={catalog}
      games={games}
    />
  );
}
