// DP4, US-10 — Simulated order. The server re-validates: an invalid cart can NEVER be ordered.
import { z } from "zod";
import { db } from "@/lib/db";
import { BuildItemSchema, NeedsProfileSchema } from "@/lib/engine/types";
import { validate } from "@/lib/engine/validate";
import { parseBody } from "@/lib/server/api";
import { getCatalog, newBuildId } from "@/lib/server/catalog";

const Body = z.object({
  items: z.array(BuildItemSchema).min(1).max(40),
  needs: NeedsProfileSchema.optional(),
  tier: z.enum(["SAVE", "RECOMMENDED", "PERFORMANCE", "CUSTOM", "UPGRADE"]),
  anonymousId: z.string().max(64).optional(),
});

export async function POST(req: Request) {
  const parsed = await parseBody(req, Body);
  if ("error" in parsed) return parsed.error;
  const { items, needs, tier, anonymousId } = parsed.data;
  const options = needs ? { includeOs: needs.includeOs, wantsWifi: !!needs.preferences.wifi, gaming: needs.uses.includes("GAMING") } : undefined;
  const report = validate(items, await getCatalog(), options);
  if (!report.ok) {
    return Response.json({ error: "Pakken passer ikke sammen eller mangler deler.", validation: report }, { status: 422 });
  }
  const buildId = newBuildId();
  const order = await db.$transaction(async (tx) => {
    await tx.build.create({
      data: {
        id: buildId,
        needs: needs as object | undefined,
        tier,
        items: items as object[],
        totalNok: report.totalNok,
        validation: { ok: true, rulesChecked: report.rulesChecked },
        assemblyService: items.some((i) => i.componentId === "acc-assembly-service"),
      },
    });
    // Only build id + anonymous id are stored – no name/address (spec 9.3 Kasse).
    return tx.order.create({ data: { buildId, totalNok: report.totalNok, anonymousId } });
  });
  return Response.json({ orderId: order.id, buildId }, { status: 201 });
}
