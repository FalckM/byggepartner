// DP2, US-04 — POST items → ValidationReport (spec 12).
import { z } from "zod";
import { BuildItemSchema } from "@/lib/engine/types";
import { validate } from "@/lib/engine/validate";
import { parseBody } from "@/lib/server/api";
import { getCatalog } from "@/lib/server/catalog";

const Body = z.object({
  items: z.array(BuildItemSchema).max(40),
  options: z.object({ includeOs: z.boolean(), wantsWifi: z.boolean(), gaming: z.boolean() }).partial().optional(),
});

export async function POST(req: Request) {
  const parsed = await parseBody(req, Body);
  if ("error" in parsed) return parsed.error;
  return Response.json(validate(parsed.data.items, await getCatalog(), parsed.data.options));
}
