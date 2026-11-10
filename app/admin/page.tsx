import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { CATEGORY_LABEL } from "@/lib/engine/labels";
import { CATEGORIES } from "@/lib/engine/types";

export const metadata: Metadata = { title: "Admin" };

export default function AdminHome() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Oversikt</h1>
        <p className="text-muted-foreground">Intern side for prosjektgruppen. Alle tall er demo-data.</p>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Henter tall …</p>}>
        <Stats />
      </Suspense>
    </div>
  );
}

async function Stats() {
  await connection();
  const [byCategory, games] = await Promise.all([
    db.component.groupBy({ by: ["category"], _count: true }),
    db.game.count(),
  ]);
  const counts = new Map(byCategory.map((r) => [r.category, r._count]));
  const total = byCategory.reduce((sum, r) => sum + r._count, 0);

  return (
    <section aria-labelledby="catalog-stats" className="space-y-3">
      <h2 id="catalog-stats" className="font-medium">
        Katalog: {total} komponenter · {games} spill
      </h2>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {CATEGORIES.map((cat) => (
          <li key={cat}>
            <Link
              href={`/admin/katalog?kategori=${cat}`}
              className="block rounded-lg border bg-card p-3 hover:border-primary"
            >
              <span className="block text-2xl font-semibold tabular-nums">{counts.get(cat) ?? 0}</span>
              <span className="text-sm text-muted-foreground">{CATEGORY_LABEL[cat]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
