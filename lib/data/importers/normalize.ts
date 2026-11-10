// US-22, spec 10.2 — One normalisation step for every import source.
// OK          → passes the full Zod schema; usable by the engine.
// INCOMPLETE  → base fields valid, specs partly missing → incompleteForValidation: true, NEVER used by the generator
//               (the compatibility guarantee requires quality-assured data – Oppgave 3, 3.6).
// ERROR       → invalid base fields or wrong types; not imported.
import { z } from "zod";
import { CategorySchema, ComponentSchema, SPEC_SCHEMAS, StockSchema, type Category } from "../../engine/types";

export type RowStatus = "OK" | "INCOMPLETE" | "ERROR";

/** What we store for an import row (a full Component when OK, partial specs when INCOMPLETE). */
export interface ImportedComponent {
  id: string;
  category: Category;
  brand: string;
  name: string;
  priceNok: number;
  stock: z.infer<typeof StockSchema>;
  deliveryDays: number;
  plainSummary: string;
  tierLabel?: string;
  imageUrl?: string;
  specs: Record<string, unknown>;
  source: string;
  isDemoData: true;
  incompleteForValidation: boolean;
}

export interface RowResult {
  row: number;
  status: RowStatus;
  id?: string;
  name?: string;
  category?: Category;
  priceNok?: number;
  missing: string[];
  errors: string[];
  component?: ImportedComponent;
}

const BaseSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id må være en slug (små bokstaver, tall og bindestrek)"),
  category: CategorySchema,
  brand: z.string().trim().min(1, "mangler merke"),
  name: z.string().trim().min(1, "mangler navn"),
  priceNok: z.coerce.number().int("pris må være et heltall").nonnegative("pris kan ikke være negativ"),
  stock: StockSchema.default("ORDER"),
  deliveryDays: z.coerce.number().int().nonnegative().default(7),
  plainSummary: z.string().trim().min(10).default("Importert del – ikke kvalitetssikret av Multicom ennå."),
  tierLabel: z.enum(["Budsjett", "Mellomklasse", "Entusiast"]).optional(),
  imageUrl: z.string().optional(),
});

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const fmt = (e: z.ZodError) => e.issues.map((i) => `${i.path.join(".") || "rad"}: ${i.message}`);

/** Required spec keys of a category that are absent (undefined/null) in `specs`. */
function missingKeys(category: Category, specs: Record<string, unknown>): string[] {
  const shape = SPEC_SCHEMAS[category].shape as Record<string, z.ZodType>;
  return Object.entries(shape)
    .filter(([key, schema]) => (specs[key] === undefined || specs[key] === null) && !schema.safeParse(undefined).success)
    .map(([key]) => key);
}

export function normalizeRecord(raw: Record<string, unknown>, row: number, source: string): RowResult {
  const base = BaseSchema.safeParse(raw);
  if (!base.success) {
    return { row, status: "ERROR", id: str(raw.id), name: str(raw.name), missing: [], errors: fmt(base.error) };
  }
  const b = base.data;
  const specs = Object.fromEntries(Object.entries((raw.specs as Record<string, unknown>) ?? {}).filter(([, v]) => v !== null && v !== undefined));
  const info = { row, id: b.id, name: b.name, category: b.category, priceNok: b.priceNok };
  const common = { ...b, specs, source, isDemoData: true as const };

  const full = ComponentSchema.safeParse({ ...common, incompleteForValidation: false });
  if (full.success) {
    return { ...info, status: "OK", missing: [], errors: [], component: { ...full.data, specs: full.data.specs as Record<string, unknown>, incompleteForValidation: false } };
  }
  const partial = SPEC_SCHEMAS[b.category].partial().safeParse(specs);
  const missing = missingKeys(b.category, specs);
  if (partial.success && missing.length > 0) {
    return { ...info, status: "INCOMPLETE", missing, errors: [], component: { ...common, specs: partial.data as Record<string, unknown>, incompleteForValidation: true } };
  }
  return { ...info, status: "ERROR", missing, errors: fmt(partial.success ? full.error : partial.error) };
}

/** Normalise many records, rejecting duplicate ids within the batch. */
export function normalizeAll(records: Record<string, unknown>[], source: string): RowResult[] {
  const seen = new Set<string>();
  return records.map((r, i) => {
    const res = normalizeRecord(r, i + 1, source);
    if (res.status !== "ERROR" && res.id) {
      if (seen.has(res.id)) return { ...res, status: "ERROR", component: undefined, errors: [`id «${res.id}» finnes flere ganger i filen`] };
      seen.add(res.id);
    }
    return res;
  });
}

export function summarize(rows: RowResult[]) {
  return {
    total: rows.length,
    ok: rows.filter((r) => r.status === "OK").length,
    incomplete: rows.filter((r) => r.status === "INCOMPLETE").length,
    error: rows.filter((r) => r.status === "ERROR").length,
  };
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}
