import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { BadgeCheck, CheckCircle2, CircleAlert, PackageCheck } from "lucide-react";
import { db } from "@/lib/db";
import { buildGuide } from "@/lib/engine/buildGuide";
import { catalogIndex } from "@/lib/engine/context";
import { CATEGORY_LABEL_PLAIN, formatNok } from "@/lib/engine/labels";
import { RULES } from "@/lib/engine/rules";
import { BuildItemSchema, NeedsProfileSchema } from "@/lib/engine/types";
import { validate } from "@/lib/engine/validate";
import { getCatalog } from "@/lib/server/catalog";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Ordrebekreftelse" };

export default function ConfirmationPage({ params }: PageProps<"/bekreftelse/[id]">) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Suspense fallback={<p className="text-muted-foreground">Henter ordren …</p>}>
        <Loader params={params} />
      </Suspense>
    </main>
  );
}

async function Loader({ params }: Pick<PageProps<"/bekreftelse/[id]">, "params">) {
  await connection();
  const { id } = await params;
  const order = await db.order.findUnique({ where: { id }, include: { build: true } });
  if (!order) notFound();
  const catalog = await getCatalog();
  const idx = catalogIndex(catalog);
  const items = z.array(BuildItemSchema).parse(order.build.items);
  const needs = NeedsProfileSchema.safeParse(order.build.needs);
  const report = validate(items, catalog, needs.success ? { includeOs: needs.data.includeOs, wantsWifi: !!needs.data.preferences.wifi, gaming: needs.data.uses.includes("GAMING") } : undefined);
  const guide = buildGuide(items, catalog);
  const date = new Intl.DateTimeFormat("nb-NO", { dateStyle: "long" }).format(order.createdAt);

  return (
    <div className="space-y-8">
      <header className="space-y-2 text-center">
        <PackageCheck aria-hidden className="mx-auto size-12 text-primary" />
        <h1 className="text-[28px] leading-tight font-bold">Takk! Bestillingen er registrert</h1>
        <p className="text-muted-foreground">
          Ordrenummer <strong className="font-mono" data-testid="order-id">{order.id}</strong> · {date} · Simulert – ingen betaling er trukket.
        </p>
      </header>

      <section aria-labelledby="summary" className="rounded-2xl border bg-card p-5">
        <h2 id="summary" className="text-xl font-semibold">
          Oppsummering
        </h2>
        <ul className="mt-3 divide-y text-sm">
          {items.map((i) => {
            const c = idx.get(i.componentId);
            return c ? (
              <li key={i.componentId} className="flex justify-between gap-4 py-2">
                <span>
                  <span className="text-muted-foreground">{CATEGORY_LABEL_PLAIN[c.category]}: </span>
                  {c.name}
                </span>
                <span className="tabular-nums">{i.owned ? "Har fra før" : formatNok(c.priceNok * (i.qty ?? 1))}</span>
              </li>
            ) : null;
          })}
        </ul>
        <p className="mt-3 flex justify-between border-t pt-3 font-heading text-xl font-semibold">
          <span>Totalt</span>
          <span className="tabular-nums">{formatNok(order.totalNok)}</span>
        </p>
      </section>

      <section aria-labelledby="cert" className="relative overflow-hidden rounded-2xl border-2 border-ok bg-card p-6" data-testid="certificate">
        <div className="absolute inset-0 bg-blueprint opacity-60" aria-hidden />
        <div className="relative space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="cert" className="flex items-center gap-2 text-2xl font-semibold">
              <BadgeCheck aria-hidden className="size-7 text-ok" /> Kompatibilitetssertifikat
            </h2>
            <PrintButton />
          </div>
          <p>
            Pakke <span className="font-mono">{order.buildId}</span> er sjekket mot {RULES.length} regler {date}.{" "}
            <strong>{report.ok ? "Alt passer sammen." : "Pakken har endret seg siden bestilling – kontakt oss."}</strong>
          </p>
          <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
            {RULES.map((rule) => {
              const applicable = report.results.some((r) => r.ruleId === rule.id);
              return (
                <li key={rule.id} className="flex items-center gap-2">
                  {applicable ? <CheckCircle2 aria-hidden className="size-4 text-ok" /> : <CircleAlert aria-hidden className="size-4 text-muted-foreground" />}
                  {rule.title}
                  {!applicable && <span className="text-muted-foreground">(ikke aktuelt)</span>}
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted-foreground">Studentprototype – sertifikatet er en demonstrasjon og gir ingen reell garanti.</p>
        </div>
      </section>

      <section aria-labelledby="guide" className="space-y-4">
        <h2 id="guide" className="text-2xl font-semibold">
          Din personlige byggeguide
        </h2>
        <ol className="space-y-3" data-testid="build-guide">
          {guide.map((s, i) => (
            <li key={i} className="flex gap-4 rounded-2xl border bg-card p-4">
              <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-primary font-heading font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <div>
                <h3 className="text-lg font-semibold">
                  {s.title}
                  {s.careful && <span className="ml-2 rounded-full bg-warn-soft px-2 py-0.5 align-middle text-xs font-medium">Vær forsiktig</span>}
                </h3>
                <p className="mt-1 text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
