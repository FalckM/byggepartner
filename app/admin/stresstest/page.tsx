import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { listGames } from "@/lib/data/games";
import { StressRunner } from "./stress-runner";

// Spec 10.4 — Generator stress test on the 2 000-component synthetic catalog (runs in the browser).
export const metadata: Metadata = { title: "Stresstest" };

export default function StressPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Stresstest av generatoren</h1>
        <p className="text-muted-foreground">
          500 tilfeldige (men faste) behovsprofiler mot en syntetisk katalog med 2 000 komponenter. Hver pakke
          valideres på nytt uavhengig. Mål: 100 % gyldige pakker og p95 under 300 ms.
        </p>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Henter spill …</p>}>
        <Loader />
      </Suspense>
    </div>
  );
}

async function Loader() {
  await connection();
  return <StressRunner games={await listGames()} />;
}
