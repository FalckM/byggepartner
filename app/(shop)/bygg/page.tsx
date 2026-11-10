import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { getCatalog } from "@/lib/server/catalog";
import { Builder } from "./builder";

export const metadata: Metadata = { title: "Bygg selv" };

export default function BuildPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <Suspense fallback={<p className="text-muted-foreground">Laster katalogen …</p>}>
        <Loader />
      </Suspense>
    </main>
  );
}

async function Loader() {
  await connection();
  return <Builder catalog={await getCatalog()} />;
}
