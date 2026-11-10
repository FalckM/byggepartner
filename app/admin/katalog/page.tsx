import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { listIncomplete, prismaSource } from "@/lib/data/prismaSource";
import { CATEGORY_LABEL, formatNok } from "@/lib/engine/labels";
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
  const [components, incomplete, params] = await Promise.all([prismaSource.listAll(), listIncomplete(), searchParams]);
  const parsed = CategorySchema.safeParse(params.kategori);
  return (
    <>
      <CatalogTable components={components} initialCategory={parsed.success ? parsed.data : "ALL"} />
      {incomplete.length > 0 && (
        <details className="rounded-xl border bg-card p-4" data-testid="incomplete-imports">
          <summary className="cursor-pointer font-semibold">
            Ufullstendige importer ({incomplete.length}) – brukes ikke av generatoren eller kundeflyten
          </summary>
          <div className="mt-3 max-h-96 overflow-auto" tabIndex={0} role="region" aria-label="Ufullstendige importer">
            <table className="w-full text-sm [&_td]:px-2 [&_td]:py-1">
              <tbody>
                {incomplete.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="whitespace-nowrap">{CATEGORY_LABEL[c.category]}</td>
                    <td>{c.name}</td>
                    <td className="text-right whitespace-nowrap tabular-nums">{formatNok(c.priceNok)}</td>
                    <td className="font-mono text-xs text-muted-foreground">{c.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </>
  );
}
