import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { getCatalog } from "@/lib/server/catalog";
import { CartView } from "./cart-view";

export const metadata: Metadata = { title: "Handlekurv" };

export default function CartPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Suspense fallback={<p className="text-muted-foreground">Henter handlekurven …</p>}>
        <Loader />
      </Suspense>
    </main>
  );
}

async function Loader() {
  await connection();
  return <CartView catalog={await getCatalog()} />;
}
