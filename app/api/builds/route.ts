// US-17 — Save a build so it can be shared via link.
import { z } from "zod";
import { db } from "@/lib/db";
import { BuildItemSchema, NeedsProfileSchema } from "@/lib/engine/types";
import { validate } from "@/lib/engine/validate";
import { parseBody } from "@/lib/server/api";
import { getCatalog, newBuildId } from "@/lib/server/catalog";

const SaveBuildBody = z.object({
  items: z.array(BuildItemSchema).min(1).max(40),
  needs: NeedsProfileSchema.optional(),
  tier: z.enum(["SAVE", "RECOMMENDED", "PERFORMANCE", "CUSTOM", "UPGRADE"]),
});

export async function POST(req: Request) {
  const parsed = await parseBody(req, SaveBuildBody);
  if ("error" in parsed) return parsed.error;
  const { items, needs, tier } = parsed.data;
  const report = validate(items, await getCatalog(), needs ? { includeOs: needs.includeOs, wantsWifi: !!needs.preferences.wifi, gaming: needs.uses.includes("GAMING") } : undefined);
  const build = await db.build.create({
    data: {
      id: newBuildId(),
      needs: needs as object | undefined,
      tier,
      items: items as object[],
      totalNok: report.totalNok,
      validation: { ok: report.ok, rulesChecked: report.rulesChecked },
      assemblyService: items.some((i) => i.componentId === "acc-assembly-service"),
    },
  });
  return Response.json({ id: build.id }, { status: 201 });
}
