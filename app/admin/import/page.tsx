import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { DATASET, DATASET_FILES, USD_TO_NOK } from "@/lib/data/importers/pcPartDataset";
import { importSources } from "@/lib/server/importer";
import { ImportTool } from "./import-tool";

// US-22, spec 10.2 — Import from an open dataset or a CSV file, with preview and per-row validation.
export const metadata: Metadata = { title: "Import" };

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Import av komponenter</h1>
        <p className="max-w-3xl text-muted-foreground">
          Alle rader sjekkes mot samme skjema som katalogen. Deler som mangler felt kompatibilitetsreglene trenger, lagres som{" "}
          <strong>ufullstendige</strong> og brukes <strong>aldri</strong> av generatoren – garantien forutsetter kvalitetssikrede data.
        </p>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Laster …</p>}>
        <Loader />
      </Suspense>
    </div>
  );
}

async function Loader() {
  await connection();
  const sources = await importSources();
  const bySource = new Map<string, { complete: number; incomplete: number }>();
  for (const s of sources) {
    const e = bySource.get(s.source) ?? { complete: 0, incomplete: 0 };
    if (s.incompleteForValidation) e.incomplete += s._count;
    else e.complete += s._count;
    bySource.set(s.source, e);
  }
  return (
    <ImportTool
      dataset={{ ...DATASET, rate: USD_TO_NOK, categories: Object.keys(DATASET_FILES) }}
      sources={[...bySource.entries()].map(([source, c]) => ({ source, ...c }))}
    />
  );
}
