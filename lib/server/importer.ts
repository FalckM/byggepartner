import "server-only";
// US-22 — Import pipeline (server): source → raw records → normalizeAll → preview / commit.
import { z } from "zod";
import { db } from "@/lib/db";
import { csvToRecords } from "@/lib/data/importers/csvImport";
import { normalizeAll, summarize, type RowResult } from "@/lib/data/importers/normalize";
import { DATASET, DATASET_FILES, fetchDatasetCategory, mapDatasetRow, uniqueIds } from "@/lib/data/importers/pcPartDataset";
import type { Category } from "@/lib/engine/types";

const DatasetCategory = z.enum(Object.keys(DATASET_FILES) as [keyof typeof DATASET_FILES, ...(keyof typeof DATASET_FILES)[]]);

export const ImportInput = z.discriminatedUnion("source", [
  z.object({ source: z.literal("pcpartdataset"), categories: z.array(DatasetCategory).min(1), limit: z.number().int().min(1).max(200).default(20) }),
  z.object({ source: z.literal("csv"), csv: z.string().min(1).max(2_000_000), name: z.string().regex(/^[a-z0-9-]{1,30}$/).default("csv") }),
]);
export type ImportInput = z.infer<typeof ImportInput>;

// The dataset files are 0.2–2 MB each; keep them in memory between preview and commit.
const datasetCache = new Map<string, { at: number; rows: Record<string, unknown>[] }>();
const CACHE_MS = 30 * 60 * 1000;

async function datasetRows(category: keyof typeof DATASET_FILES) {
  const hit = datasetCache.get(category);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.rows;
  const rows = await fetchDatasetCategory(category);
  datasetCache.set(category, { at: Date.now(), rows });
  return rows;
}

export interface PreviewResult {
  source: string;
  rows: RowResult[];
  summary: ReturnType<typeof summarize>;
  note?: string;
}

export async function preview(input: ImportInput): Promise<PreviewResult> {
  if (input.source === "csv") {
    const source = `import:${input.name}`;
    const rows = normalizeAll(csvToRecords(input.csv), source);
    return { source, rows: await markSeedConflicts(rows), summary: summarize(rows) };
  }
  const source = `import:${DATASET.name}`;
  const records: Record<string, unknown>[] = [];
  for (const cat of input.categories) {
    const raw = await datasetRows(cat);
    let n = 0;
    for (const r of raw) {
      if (n >= input.limit) break;
      const mapped = mapDatasetRow(cat as Category, r);
      if (mapped) {
        records.push(mapped);
        n++;
      }
    }
  }
  const rows = await markSeedConflicts(normalizeAll(uniqueIds(records), source));
  return { source, rows, summary: summarize(rows), note: `Kilde: ${DATASET.url} (${DATASET.license}). Priser omregnet fra USD med fast demo-kurs.` };
}

/** Never overwrite the curated seed catalog. */
async function markSeedConflicts(rows: RowResult[]): Promise<RowResult[]> {
  const ids = rows.flatMap((r) => (r.id && r.status !== "ERROR" ? [r.id] : []));
  const seedIds = new Set((await db.component.findMany({ where: { id: { in: ids }, source: "seed" }, select: { id: true } })).map((r) => r.id));
  return rows.map((r) =>
    r.id && seedIds.has(r.id) ? { ...r, status: "ERROR", component: undefined, errors: [`id «${r.id}» brukes allerede av den kvalitetssikrede katalogen`] } : r,
  );
}

export async function commit(input: ImportInput) {
  const p = await preview(input); // re-run server side – never trust client-supplied components
  const toWrite = p.rows.flatMap((r) => (r.component ? [r.component] : []));
  await db.$transaction(
    toWrite.map((c) => {
      const data = {
        category: c.category,
        brand: c.brand,
        name: c.name,
        priceNok: c.priceNok,
        stock: c.stock,
        deliveryDays: c.deliveryDays,
        plainSummary: c.plainSummary,
        tierLabel: c.tierLabel ?? null,
        imageUrl: c.imageUrl ?? null,
        specs: c.specs as object,
        source: c.source,
        isDemoData: true,
        incompleteForValidation: c.incompleteForValidation,
      };
      return db.component.upsert({ where: { id: c.id }, create: { id: c.id, ...data }, update: data });
    }),
  );
  return { ...p.summary, written: toWrite.length, source: p.source };
}

export async function removeImported(source: string) {
  if (!source.startsWith("import:")) throw new Error("Kan bare fjerne importerte deler");
  return (await db.component.deleteMany({ where: { source } })).count;
}

export async function importSources() {
  return db.component.groupBy({ by: ["source", "incompleteForValidation"], where: { source: { startsWith: "import:" } }, _count: true });
}
