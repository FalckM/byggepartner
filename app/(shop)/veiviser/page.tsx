import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { getGames } from "@/lib/server/catalog";
import { Wizard } from "./wizard";

export const metadata: Metadata = { title: "Hjelp meg å velge" };

export default function WizardPage() {
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
  const games = await getGames();
  return <Wizard games={games.map((g) => ({ slug: g.slug, name: g.name, genre: g.genre }))} />;
}
