// US-16 — Start a moderated test session. Participants are identified by code only (RESP-xx).
import { z } from "zod";
import { db } from "@/lib/db";
import { parseBody } from "@/lib/server/api";

const Body = z.object({
  participantCode: z.string().trim().regex(/^RESP-\d{2,3}$/i, "Bruk formatet RESP-08").transform((s) => s.toUpperCase()),
  segment: z.string().trim().min(1).max(60),
  taskDescription: z.string().trim().min(5).max(500),
});

export async function POST(req: Request) {
  const parsed = await parseBody(req, Body);
  if ("error" in parsed) return parsed.error;
  const s = await db.testSession.create({ data: parsed.data });
  return Response.json({ id: s.id, startedAt: s.startedAt }, { status: 201 });
}
