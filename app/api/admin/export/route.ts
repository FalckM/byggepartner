// US-16 — CSV export for the report (sessions, events or per-session summary).
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { sessionSummaries } from "@/lib/analytics/metrics";

const esc = (v: unknown) => {
  const s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
};

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "summary";
  let rows: Record<string, unknown>[];
  if (type === "events") {
    rows = (await db.event.findMany({ orderBy: { ts: "asc" } })).map((e) => ({ ts: e.ts, type: e.type, anonymousId: e.anonymousId, sessionId: e.sessionId, payload: e.payload }));
  } else if (type === "sessions") {
    rows = (await db.testSession.findMany({ orderBy: { startedAt: "asc" } })).map((s) => ({ ...s }));
  } else {
    const [sessions, events] = await Promise.all([db.testSession.findMany(), db.event.findMany({ where: { sessionId: { not: null } } })]);
    rows = sessionSummaries(sessions, events).map((s) => ({ ...s }));
  }
  // BOM so Excel opens æøå correctly.
  return new Response("﻿" + csv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="byggepartner-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
