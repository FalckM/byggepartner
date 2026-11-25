"use client";
// US-16 — Discreet bar while a moderated test is running (timer + end button).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleStop } from "lucide-react";
import { flushNow } from "@/lib/analytics/track";
import { useTestSession, useTestSessionHydrated } from "@/lib/client/test-session";

export function TestBar() {
  const router = useRouter();
  const hydrated = useTestSessionHydrated();
  const session = useTestSession((s) => s.session);
  // Clock only runs in effects – Date.now() during render breaks prerendering (Cache Components).
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!session) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [session]);
  if (!hydrated || !session) return null;
  const sec = now === null ? 0 : Math.max(0, Math.floor((now - session.startedAt) / 1000));
  const mmss = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
  return (
    <div className="no-print border-b bg-muted text-xs" data-testid="test-bar">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-1">
        <span className="size-2 rounded-full bg-err motion-safe:animate-pulse" aria-hidden />
        <span>
          Testøkt <strong>{session.participantCode}</strong> · <span className="tabular-nums">{mmss}</span>
        </span>
        <button
          type="button"
          onClick={async () => {
            await flushNow();
            router.push("/test/avslutt");
          }}
          className="ml-auto inline-flex min-h-8 items-center gap-1 rounded-full px-2 font-medium hover:bg-background"
        >
          <CircleStop aria-hidden className="size-3.5" /> Avslutt testøkt
        </button>
      </div>
    </div>
  );
}
