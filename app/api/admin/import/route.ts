// US-22 — POST {mode: "preview"|"commit", ...input} · DELETE ?source=import:xyz
import type { NextRequest } from "next/server";
import { z } from "zod";
import { commit, ImportInput, preview, removeImported } from "@/lib/server/importer";

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "Ugyldig JSON" }, { status: 400 });
  }
  const mode = z.object({ mode: z.enum(["preview", "commit"]) }).safeParse(json);
  const input = ImportInput.safeParse(json);
  if (!mode.success || !input.success) {
    return Response.json({ error: "Valideringsfeil", fields: input.success ? undefined : z.flattenError(input.error).fieldErrors }, { status: 400 });
  }
  try {
    return Response.json(mode.data.mode === "preview" ? await preview(input.data) : await commit(input.data));
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Import feilet" }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest) {
  const source = req.nextUrl.searchParams.get("source") ?? "";
  if (!/^import:[a-z0-9-]+$/.test(source)) return Response.json({ error: "Ugyldig kilde" }, { status: 400 });
  return Response.json({ removed: await removeImported(source) });
}
