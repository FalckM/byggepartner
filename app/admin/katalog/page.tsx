import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { prismaSource } from "@/lib/data/prismaSource";
import { CategorySchema } from "@/lib/engine/types";
import { CatalogTable } from "./catalog-table";

// US-11, US-22 — Phase 1 gate: list every component with filtering.
export const metadata: Metadata = { title: "Katalog" };

export default function CatalogPage({ searchParams }: PageProps<"/admin/katalog">) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Komponentkatalog</h1>
        <p className="text-muted-foreground">
          Alle komponenter fra databasen, validert med Zod. Priser og spesifikasjoner er demo-data.
        </p>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Henter komponenter …</p>}>
        <CatalogLoader searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CatalogLoader({ searchParams }: Pick<PageProps<"/admin/katalog">, "searchParams">) {
  await connection();
  const [components, params] = await Promise.all([prismaSource.listAll(), searchParams]);
  const parsed = CategorySchema.safeParse(params.kategori);
  return <CatalogTable components={components} initialCategory={parsed.success ? parsed.data : "ALL"} />;
}
