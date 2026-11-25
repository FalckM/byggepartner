import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { getCatalog } from "@/lib/server/catalog";
import { Checkout } from "./checkout";

export const metadata: Metadata = { title: "Kasse" };

export default function CheckoutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Suspense fallback={<p className="text-muted-foreground">Laster …</p>}>
        <Loader />
      </Suspense>
    </main>
  );
}

async function Loader() {
  await connection();
  return <Checkout catalog={await getCatalog()} />;
}
