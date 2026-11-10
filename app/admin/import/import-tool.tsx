"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Database, Download, FileUp, Loader2, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RowResult } from "@/lib/data/importers/normalize";
import { CATEGORY_LABEL, formatNok } from "@/lib/engine/labels";
import type { Category } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

type Input = { source: "pcpartdataset"; categories: string[]; limit: number } | { source: "csv"; csv: string; name: string };
type Preview = { source: string; rows: RowResult[]; summary: { total: number; ok: number; incomplete: number; error: number }; note?: string };

export function ImportTool({
  dataset,
  sources,
}: {
  dataset: { repo: string; license: string; url: string; rate: number; categories: string[] };
  sources: { source: string; complete: number; incomplete: number }[];
}) {
  const router = useRouter();
  const [cats, setCats] = useState<string[]>(["GPU", "CASE", "OS"]);
  const [limit, setLimit] = useState(10);
  const [csvName, setCsvName] = useState("csv");
  const [input, setInput] = useState<Input | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function call(mode: "preview" | "commit", body: Input) {
    setBusy(mode);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode, ...body }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import feilet");
      if (mode === "preview") {
        setInput(body);
        setPreview(data);
      } else {
        setMessage(`Importerte ${data.written} rader (${data.ok} komplette, ${data.incomplete} ufullstendige). ${data.error} rader med feil ble hoppet over.`);
        setPreview(null);
        router.refresh();
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const csv = await file.text();
    const name = file.name.replace(/\.csv$/i, "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 30) || "csv";
    setCsvName(name);
    void call("preview", { source: "csv", csv, name });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="ds" className="space-y-3 rounded-xl border bg-card p-4">
          <h2 id="ds" className="flex items-center gap-2 font-semibold">
            <Database aria-hidden className="size-4" /> Åpent datasett
          </h2>
          <p className="text-sm text-muted-foreground">
            <a href={dataset.url} className="underline" target="_blank" rel="noreferrer">
              {dataset.repo}
            </a>{" "}
            · {dataset.license}. Skrapet fra PCPartPicker. USD-priser regnes om med fast demo-kurs ({dataset.rate} kr) + 25 % mva.
          </p>
          <fieldset>
            <legend className="text-sm font-medium">Kategorier</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {dataset.categories.map((c) => (
                <label key={c} className="flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-secondary">
                  <input type="checkbox" checked={cats.includes(c)} onChange={(e) => setCats(e.target.checked ? [...cats, c] : cats.filter((x) => x !== c))} className="size-4 accent-[var(--primary)]" />
                  {CATEGORY_LABEL[c as Category]}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm">
            Maks rader per kategori
            <input type="number" min={1} max={200} value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="h-9 w-20 rounded-lg border bg-background px-2" />
          </label>
          <Button onClick={() => call("preview", { source: "pcpartdataset", categories: cats, limit })} disabled={!cats.length || !!busy}>
            {busy === "preview" && input?.source !== "csv" ? <Loader2 aria-hidden className="animate-spin" /> : <Download aria-hidden />} Hent og forhåndsvis
          </Button>
        </section>

        <section aria-labelledby="csv" className="space-y-3 rounded-xl border bg-card p-4">
          <h2 id="csv" className="flex items-center gap-2 font-semibold">
            <FileUp aria-hidden className="size-4" /> CSV-fil
          </h2>
          <p className="text-sm text-muted-foreground">
            Én rad per del. Faste kolonner (<code>id, category, brand, name, priceNok …</code>) og spesifikasjoner som <code>spec.socket</code>,{" "}
            <code>spec.powerConnectors.pcie8pin</code>. Lister skilles med «|». Komma eller semikolon fungerer.
          </p>
          <a href="/api/admin/import/template" className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium underline underline-offset-4">
            <Download aria-hidden className="size-4" /> Last ned mal med eksempler
          </a>
          <div>
            <label htmlFor="csv-file" className="text-sm font-medium">
              Velg CSV-fil
            </label>
            <input id="csv-file" type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])} className="mt-1 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground" />
          </div>
        </section>
      </div>

      {message && (
        <p role="status" className="rounded-xl border bg-card p-3" data-testid="import-message">
          {message}
        </p>
      )}

      {preview && input && (
        <section aria-labelledby="pv" className="space-y-3 rounded-xl border bg-card p-4" data-testid="import-preview">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="pv" className="font-semibold">
              Forhåndsvisning – {preview.source}
            </h2>
            <Button onClick={() => call("commit", input)} disabled={!!busy || preview.summary.ok + preview.summary.incomplete === 0} data-testid="import-commit">
              {busy === "commit" && <Loader2 aria-hidden className="animate-spin" />}
              Importer {preview.summary.ok + preview.summary.incomplete} rader
            </Button>
          </div>
          <p className="flex flex-wrap gap-x-4 text-sm" data-testid="import-summary">
            <span><CheckCircle2 aria-hidden className="mr-1 inline size-4 text-ok" />{preview.summary.ok} komplette</span>
            <span><AlertTriangle aria-hidden className="mr-1 inline size-4 text-warn" />{preview.summary.incomplete} ufullstendige</span>
            <span><XCircle aria-hidden className="mr-1 inline size-4 text-err" />{preview.summary.error} med feil (hoppes over)</span>
          </p>
          {preview.note && <p className="text-xs text-muted-foreground">{preview.note}</p>}
          <div className="max-h-[32rem] overflow-auto rounded-lg border" tabIndex={0} role="region" aria-label="Forhåndsvisning av import">
            <table className="w-full text-sm [&_td]:px-2 [&_td]:py-1.5 [&_th]:px-2">
              <thead className="sticky top-0 bg-muted text-left">
                <tr>
                  <th>Rad</th>
                  <th>Status</th>
                  <th>Del</th>
                  <th className="text-right">Pris</th>
                  <th>Mangler / feil</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.row} className="border-t align-top" data-testid="import-row" data-status={r.status}>
                    <td className="tabular-nums">{r.row}</td>
                    <td><Status s={r.status} /></td>
                    <td>
                      <span className="block font-medium">{r.name ?? "–"}</span>
                      <span className="font-mono text-xs text-muted-foreground">{r.category ? CATEGORY_LABEL[r.category] : ""} · {r.id}</span>
                    </td>
                    <td className="text-right whitespace-nowrap tabular-nums">{r.priceNok !== undefined ? formatNok(r.priceNok) : "–"}</td>
                    <td className="text-xs">
                      {r.missing.length > 0 && <span className="block">Mangler: {r.missing.join(", ")}</span>}
                      {r.errors.map((e, i) => (
                        <span key={i} className="block text-err">{e}</span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section aria-labelledby="src" className="rounded-xl border bg-card p-4">
        <h2 id="src" className="font-semibold">Importerte kilder</h2>
        {sources.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Ingen importer ennå. Katalogen består bare av den kvalitetssikrede seed-katalogen.</p>
        ) : (
          <ul className="mt-2 divide-y text-sm" data-testid="import-sources">
            {sources.map((s) => (
              <li key={s.source} className="flex flex-wrap items-center gap-3 py-2" data-source={s.source}>
                <span className="font-mono">{s.source}</span>
                <span className="text-muted-foreground">
                  {s.complete} komplette · {s.incomplete} ufullstendige (brukes ikke)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  onClick={async () => {
                    if (!window.confirm(`Fjerne alle deler fra ${s.source}?`)) return;
                    await fetch(`/api/admin/import?source=${encodeURIComponent(s.source)}`, { method: "DELETE" });
                    router.refresh();
                  }}
                >
                  <Trash2 aria-hidden /> Fjern
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-xs text-muted-foreground">Navn på siste CSV-kilde: import:{csvName}</p>
    </div>
  );
}

function Status({ s }: { s: RowResult["status"] }) {
  const map = {
    OK: [CheckCircle2, "text-ok", "Komplett"],
    INCOMPLETE: [AlertTriangle, "text-warn", "Ufullstendig"],
    ERROR: [XCircle, "text-err", "Feil"],
  } as const;
  const [Icon, color, label] = map[s];
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap font-medium", color)}>
      <Icon aria-hidden className="size-4" /> <span className="text-foreground">{label}</span>
    </span>
  );
}
