// H1–H3, US-16 — Analytics events. Anonymous id only: no IP, no user agent, no third parties (spec 11).
import { db } from "@/lib/db";
import { EventBatchSchema } from "@/lib/analytics/events";
import { parseBody } from "@/lib/server/api";
import { rateLimit } from "@/lib/server/rate-limit";

const DAY = 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  const parsed = await parseBody(req, EventBatchSchema);
  if ("error" in parsed) return parsed.error;
  const { anonymousId, sessionId, events } = parsed.data;
  if (!rateLimit(`events:${anonymousId}`, 300)) return Response.json({ error: "For mange hendelser" }, { status: 429 });

  // Only attach to a session that exists and is still running.
  const session = sessionId ? await db.testSession.findFirst({ where: { id: sessionId, finishedAt: null }, select: { id: true } }) : null;
  const now = Date.now();
  await db.event.createMany({
    data: events.map((e) => ({
      anonymousId,
      sessionId: session?.id ?? null,
      type: e.type,
      payload: e.payload as object,
      // Client clock is used for durations; clamp obviously wrong clocks.
      ts: new Date(Math.abs(e.ts - now) < DAY ? e.ts : now),
    })),
  });
  return new Response(null, { status: 204 });
}
