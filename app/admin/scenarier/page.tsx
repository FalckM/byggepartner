import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { listGames } from "@/lib/data/games";
import { prismaSource } from "@/lib/data/prismaSource";
import { loadSeedScenarios } from "@/lib/data/seedData";
import { ScenarioRunner } from "./scenario-runner";

// US-11 — Run every test scenario (S01–S12) against the live catalog. The engine runs in the browser.
export const metadata: Metadata = { title: "Scenarier" };

export default function ScenariosPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Testscenarier</h1>
        <p className="text-muted-foreground">
          Scenariene fra <code className="font-mono text-sm">seed/scenarios.json</code> kjøres mot katalogen i databasen
          – samme kode som Vitest bruker. Motoren kjører i nettleseren din.
        </p>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Henter katalog og spill …</p>}>
        <Loader />
      </Suspense>
    </div>
  );
}

async function Loader() {
  await connection();
  const [catalog, games] = await Promise.all([prismaSource.listAll(), listGames()]);
  return <ScenarioRunner catalog={catalog} games={games} scenarios={loadSeedScenarios()} />;
}
