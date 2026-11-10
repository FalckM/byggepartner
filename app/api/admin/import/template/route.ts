// US-22 — Downloadable CSV template: three real, valid example rows from the curated catalog.
import { componentsToCsv } from "@/lib/data/importers/csvImport";
import { loadSeedCatalog } from "@/lib/data/seedData";

export function GET() {
  const examples = loadSeedCatalog().filter((c) => ["ram-ddr5-32-6000", "ssd-nvme-1tb-gen4", "psu-750-gold-atx31"].includes(c.id));
  const csv = componentsToCsv(examples.map((c) => ({ ...c, id: `${c.id}-kopi` })), ";");
  return new Response("﻿" + csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="byggepartner-importmal.csv"' },
  });
}
