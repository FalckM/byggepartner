"use client";
// US-16, H1–H3 — «Hvor trygg er du på at PC-en vil fungere? (1–5)» + moderator notes.
import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { flushNow } from "@/lib/analytics/track";
import { useTestSession, useTestSessionHydrated } from "@/lib/client/test-session";
import { cn } from "@/lib/utils";

const SCALE = ["Svært usikker", "Usikker", "Både og", "Trygg", "Svært trygg"];

export function FinishSession() {
  const hydrated = useTestSessionHydrated();
  const session = useTestSession((s) => s.session);
  const end = useTestSession((s) => s.end);
  const [score, setScore] = useState<number | null>(null);
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!hydrated) return <p className="text-muted-foreground">Laster …</p>;
  if (done) {
    return (
      <div className="space-y-4 py-10 text-center" data-testid="session-finished">
        <CheckCircle2 aria-hidden className="mx-auto size-12 text-ok" />
        <h1 className="text-3xl font-semibold">Takk for at du testet!</h1>
        <p className="text-muted-foreground">Testøkt {done} er lagret.</p>
        <div className="flex justify-center gap-3">
          <Link href="/test" className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-medium text-primary-foreground">
            Start ny testøkt
          </Link>
          <Link href="/admin/analyse" className="inline-flex min-h-11 items-center rounded-full border px-5 font-medium">
            Se analyse
          </Link>
        </div>
      </div>
    );
  }
  if (!session) {
    return (
      <p>
        Ingen testøkt pågår. <Link href="/test" className="underline">Start en ny</Link>.
      </p>
    );
  }
  const isCompleted = completed ?? !!session.orderId;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!score || !session) return setError("Velg et tall fra 1 til 5.");
    await flushNow(); // all events must be stored before the session is closed
    const res = await fetch(`/api/test-sessions/${session.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ completed: isCompleted, confidenceScore: score, notes: notes || undefined }),
    });
    if (!res.ok) return setError("Kunne ikke lagre – prøv igjen.");
    setDone(session.participantCode);
    end();
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Testøkt {session.participantCode} · {session.segment}</p>
        <h1 className="mt-1 text-3xl font-semibold">{session.orderId ? "Bra! Du fullførte bestillingen." : "Testøkten avsluttes"}</h1>
      </div>
      <fieldset className="space-y-3 rounded-2xl border bg-card p-5">
        <legend className="px-1 font-heading text-xl font-semibold">Hvor trygg er du på at PC-en vil fungere?</legend>
        <div className="grid grid-cols-5 gap-2">
          {SCALE.map((label, i) => (
            <label
              key={i}
              className={cn(
                "flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 p-2 text-center has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
                score === i + 1 ? "border-primary bg-secondary" : "border-border",
              )}
            >
              <input type="radio" name="score" value={i + 1} checked={score === i + 1} onChange={() => setScore(i + 1)} className="sr-only" aria-label={`${i + 1} – ${label}`} />
              <span className="font-heading text-2xl font-semibold">{i + 1}</span>
              <span className="text-[11px] leading-tight text-muted-foreground">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-3 rounded-2xl border bg-card p-5">
        <legend className="px-1 font-heading text-lg font-semibold">For moderator</legend>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isCompleted} onChange={(e) => setCompleted(e.target.checked)} className="size-5 accent-[var(--primary)]" />
          Oppgaven ble fullført
        </label>
        <label htmlFor="notes" className="block font-medium">
          Notater (ingen personopplysninger)
        </label>
        <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="w-full rounded-xl border bg-background p-3" />
      </fieldset>
      {error && (
        <p role="alert" className="text-err">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="min-h-12 rounded-full">
        Lagre og avslutt testøkten
      </Button>
    </form>
  );
}
