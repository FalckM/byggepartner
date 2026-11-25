"use client";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart, useCartHydrated } from "@/lib/client/cart-store";

export function CartLink() {
  const hydrated = useCartHydrated();
  const count = useCart((s) => s.items.filter((i) => !i.owned).length);
  const n = hydrated ? count : 0;
  return (
    <Link
      href="/handlekurv"
      className="relative inline-flex min-h-11 items-center gap-2 rounded-full border bg-card px-4 text-sm font-medium transition-shadow hover:shadow-sm"
      aria-label={n ? `Handlekurv, ${n} deler` : "Handlekurv"}
    >
      <ShoppingBag aria-hidden className="size-4" />
      <span className="hidden sm:inline">Handlekurv</span>
      {n > 0 && (
        <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground tabular-nums">
          {n}
        </span>
      )}
    </Link>
  );
}
