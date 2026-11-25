"use client";
// US-16 — Moderator starts a test session; the shop then shows a discreet test bar.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_TASK, SEGMENTS } from "@/lib/analytics/events";
import { useBuilder } from "@/lib/client/builder-store";
import { useCart } from "@/lib/client/cart-store";
import { useTestSession, useTestSessionHydrated } from "@/lib/client/test-session";

export function StartSession() {
  const router = useRouter();
  const hydrated = useTestSessionHydrated();
  const active = useTestSession((s) => s.session);
  const start = useTestSession((s) => s.start);
  const clearCart = useCart((s) => s.clear);
  const loadBuilder = useBuilder((s) => s.load);
  const [code, setCode] = useState("RESP-");
  const [segment, setSegment] = useState<string>(SEGMENTS[0]);
  const [task, setTask] = useState(DEFAULT_TASK);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onStart(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/test-sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ participantCode: code, segment, taskDescription: task }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return setError(body?.fields?.participantCode?.[0] ?? "Kunne ikke starte testøkten.");
    }
    const { id, startedAt } = await res.json();
    clearCart(); // every participant starts with an empty shop
    loadBuilder([]);
    start({ id, participantCode: code.toUpperCase(), segment, task, startedAt: new Date(startedAt).getTime() });
    router.push("/");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Start en testøkt</h1>
        <p className="mt-2 text-muted-foreground">
          Deltakeren identifiseres bare med kode (RESP-xx), i tråd med samtykkeskjemaet. Butikken åpnes i samme fane med en diskret testlinje.
          Tid, steg, nøling og trygghetsscore logges anonymt.
        </p>
      </div>
      {hydrated && active && (
        <p className="rounded-xl border-2 border-warn bg-warn-soft p-3 text-sm" role="status">
          En testøkt pågår allerede ({active.participantCode}).{" "}
          <a href="/test/avslutt" className="font-medium underline">
            Avslutt den først
          </a>
          .
        </p>
      )}
      <form onSubmit={onStart} className="space-y-4 rounded-2xl border bg-card p-5">
        <div className="space-y-1.5">
          <label htmlFor="code" className="font-medium">
            Deltakerkode
          </label>
          <input id="code" value={code} onChange={(e) => setCode(e.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 font-mono" aria-describedby="code-help" />
          <p id="code-help" className="text-sm text-muted-foreground">
            F.eks. RESP-08. Ikke skriv navn.
          </p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="segment" className="font-medium">
            Segment
          </label>
          <select id="segment" value={segment} onChange={(e) => setSegment(e.target.value)} className="h-11 w-full rounded-xl border bg-background px-3">
            {SEGMENTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="task" className="font-medium">
            Oppgave (leses opp for deltakeren)
          </label>
          <textarea id="task" value={task} onChange={(e) => setTask(e.target.value)} rows={3} className="w-full rounded-xl border bg-background p-3" />
        </div>
        {error && (
          <p role="alert" className="text-sm text-err">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="min-h-12 rounded-full" disabled={busy || (hydrated && !!active)}>
          <Play aria-hidden /> Start testøkt og åpne butikken
        </Button>
      </form>
    </div>
  );
}
