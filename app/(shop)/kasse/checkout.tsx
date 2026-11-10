"use client";
// US-10 — Simulated checkout. No payment, no personal data leaves the browser: only build + anonymous id.
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CreditCard, Loader2, Lock, ReceiptText, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { flushNow, track } from "@/lib/analytics/track";
import { useTestSession } from "@/lib/client/test-session";
import { useCart, useCartHydrated } from "@/lib/client/cart-store";
import { anonymousId } from "@/lib/client/safe-storage";
import { formatNok } from "@/lib/engine/labels";
import type { Catalog } from "@/lib/engine/types";
import { validate } from "@/lib/engine/validate";

const Form = z.object({
  name: z.string().trim().min(2, "Skriv navnet ditt (f.eks. «Test»)"),
  address: z.string().trim().min(2, "Skriv en adresse (f.eks. «Test»)"),
  zip: z.string().regex(/^\d{4}$/, "Postnummer har fire siffer"),
  city: z.string().trim().min(2, "Skriv poststed"),
});
type FormValues = z.infer<typeof Form>;

export function Checkout({ catalog }: { catalog: Catalog }) {
  const router = useRouter();
  const hydrated = useCartHydrated();
  const { items, needs, tier, clear } = useCart();
  const [error, setError] = useState<string | null>(null);
  const completed = useRef(false);
  const testSession = useTestSession((s) => s.session);
  const markCompleted = useTestSession((s) => s.markCompleted);
  const report = useMemo(
    () => validate(items, catalog, needs ? { includeOs: needs.includeOs, wantsWifi: !!needs.preferences.wifi, gaming: needs.uses.includes("GAMING") } : undefined),
    [items, catalog, needs],
  );
  const { register, handleSubmit, formState } = useForm<FormValues>({ resolver: zodResolver(Form), defaultValues: { name: "", address: "", zip: "", city: "" } });

  useEffect(() => {
    if (!hydrated) return;
    track("checkout_started", { total: report.totalNok, complete: report.ok });
    return () => {
      if (!completed.current) track("cart_abandoned", { from: "checkout" });
    };
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hydrated) return <p className="text-muted-foreground">Laster …</p>;
  if (!items.length || !report.ok) {
    return (
      <div className="space-y-4 py-12 text-center">
        <h1 className="text-3xl font-semibold">Ikke helt klar for kassen</h1>
        <p className="text-muted-foreground">Handlekurven er tom eller har noe som må fikses først.</p>
        <Link href="/handlekurv" className="inline-flex min-h-12 items-center rounded-full bg-primary px-6 font-semibold text-primary-foreground">
          Tilbake til handlekurven
        </Link>
      </div>
    );
  }

  async function onSubmit() {
    setError(null);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items, needs, tier, anonymousId: anonymousId() }),
    });
    if (!res.ok) {
      setError(res.status === 422 ? "Pakken passer ikke lenger sammen – gå tilbake til handlekurven." : "Noe gikk galt, prøv igjen.");
      return;
    }
    const { orderId } = await res.json();
    completed.current = true;
    track("checkout_completed", { orderId, total: report.totalNok });
    clear();
    if (testSession) {
      // Moderated test: the task is done – go straight to the confidence question (spec 11).
      markCompleted(orderId);
      await flushNow();
      router.push("/test/avslutt");
      return;
    }
    router.push(`/bekreftelse/${orderId}`);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold sm:text-4xl">Kasse</h1>
      <p className="flex items-center gap-2 rounded-xl border bg-ok-soft p-3 text-sm">
        <ShieldCheck aria-hidden className="size-5 text-ok" /> Alt passer sammen – {formatNok(report.totalNok)}
      </p>
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate className="space-y-6">
        <fieldset className="space-y-4 rounded-2xl border bg-card p-5">
          <legend className="px-1 font-heading text-lg font-semibold">Levering</legend>
          <p className="text-sm text-muted-foreground">Dette er en simulert kasse – skriv gjerne «Test». Ingenting av dette lagres eller sendes.</p>
          <Field id="name" label="Fullt navn" error={formState.errors.name?.message} autoComplete="off" {...register("name")} />
          <Field id="address" label="Adresse" error={formState.errors.address?.message} autoComplete="off" {...register("address")} />
          <div className="grid grid-cols-[8rem_1fr] gap-3">
            <Field id="zip" label="Postnummer" inputMode="numeric" error={formState.errors.zip?.message} autoComplete="off" {...register("zip")} />
            <Field id="city" label="Poststed" error={formState.errors.city?.message} autoComplete="off" {...register("city")} />
          </div>
        </fieldset>
        <fieldset className="rounded-2xl border bg-card p-5" disabled>
          <legend className="px-1 font-heading text-lg font-semibold">Betaling</legend>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock aria-hidden className="size-4" /> Betaling er slått av i prototypen.
          </p>
          <div className="mt-3 grid gap-2 opacity-60 sm:grid-cols-3" aria-hidden>
            {[
              [<CreditCard key="c" className="size-5" />, "Kort"],
              [<ReceiptText key="f" className="size-5" />, "Faktura"],
              [<Wallet key="d" className="size-5" />, "Delbetaling"],
            ].map(([icon, label]) => (
              <div key={label as string} className="flex min-h-12 items-center gap-2 rounded-xl border border-dashed px-3">
                {icon} {label}
              </div>
            ))}
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="rounded-xl border-2 border-err bg-err-soft p-3">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="min-h-12 w-full rounded-full text-base" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? <Loader2 aria-hidden className="animate-spin" /> : null} Fullfør (simulert)
        </Button>
      </form>
    </div>
  );
}

function Field({ id, label, error, ...props }: { id: string; label: string; error?: string } & React.ComponentProps<"input">) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} className="h-11" {...props} />
      {error && (
        <p id={`${id}-err`} className="text-sm text-err">
          {error}
        </p>
      )}
    </div>
  );
}
