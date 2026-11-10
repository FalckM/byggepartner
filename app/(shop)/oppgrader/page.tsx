import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { getCatalog, getGames } from "@/lib/server/catalog";
import { UpgradeForm } from "./upgrade-form";

export const metadata: Metadata = { title: "Oppgrader PC-en din" };

export default function UpgradePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <Suspense fallback={<p className="text-muted-foreground">Laster …</p>}>
        <Loader />
      </Suspense>
    </main>
  );
}

async function Loader() {
  await connection();
  const [catalog, games] = await Promise.all([getCatalog(), getGames()]);
  return (
    <UpgradeForm
      parts={catalog
        .filter((c) => c.category !== "OS" && c.category !== "ACCESSORY")
        .map((c) => ({ id: c.id, name: c.name, category: c.category }))}
      games={games.map((g) => ({ slug: g.slug, name: g.name }))}
    />
  );
}
