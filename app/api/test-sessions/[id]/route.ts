// US-16 — Finish a session with the self-reported confidence score (1–5) and moderator notes.
import { z } from "zod";
import { db } from "@/lib/db";
import { parseBody } from "@/lib/server/api";

const Body = z.object({
  completed: z.boolean(),
  confidenceScore: z.number().int().min(1).max(5),
  notes: z.string().max(2000).optional(),
});

export async function PATCH(req: Request, ctx: RouteContext<"/api/test-sessions/[id]">) {
  const { id } = await ctx.params;
  const parsed = await parseBody(req, Body);
  if ("error" in parsed) return parsed.error;
  const existing = await db.testSession.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Fant ikke testøkten" }, { status: 404 });
  const s = await db.testSession.update({
    where: { id },
    data: { ...parsed.data, finishedAt: existing.finishedAt ?? new Date() },
  });
  return Response.json(s);
}
