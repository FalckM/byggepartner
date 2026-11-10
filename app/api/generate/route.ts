// DP1, US-01..03, US-13 — POST needs → three packages (spec 12).
import { z } from "zod";
import { db } from "@/lib/db";
import { generate } from "@/lib/engine/generate";
import { CategorySchema, NeedsProfileSchema } from "@/lib/engine/types";
import { parseBody } from "@/lib/server/api";
import { getCatalog, getGames, newBuildId } from "@/lib/server/catalog";

const Body = z.object({ needs: NeedsProfileSchema, upgradeCategories: z.array(CategorySchema).optional() });

export async function POST(req: Request) {
  const parsed = await parseBody(req, Body);
  if ("error" in parsed) return parsed.error;
  const { needs, upgradeCategories } = parsed.data;
  const [catalog, games] = await Promise.all([getCatalog(), getGames()]);
  const res = generate(needs, catalog, games, { upgradeCategories });
  if (!res.ok) {
    return Response.json({ reason: res.reason, minimumNok: res.minimumNok, message: res.message }, { status: 422 });
  }
  const rec = res.packages.find((p) => p.tier === "RECOMMENDED")!;
  const upgrade = !!upgradeCategories?.length || !!needs.existingParts?.length;
  const build = await db.build.create({
    data: {
      id: newBuildId(),
      needs: { ...needs, upgradeCategories } as object,
      tier: upgrade ? "UPGRADE" : "RECOMMENDED",
      items: rec.items as object[],
      totalNok: rec.totalNok,
      validation: { ok: rec.validation.ok, rulesChecked: rec.validation.rulesChecked },
      assemblyService: needs.assemblyService,
    },
  });
  return Response.json({ buildId: build.id, profile: res.profile, packages: res.packages, durationMs: res.durationMs });
}
