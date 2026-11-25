import { db } from "@/lib/db";

export async function GET(_req: Request, ctx: RouteContext<"/api/builds/[id]">) {
  const { id } = await ctx.params;
  const build = await db.build.findUnique({ where: { id } });
  if (!build) return Response.json({ error: "Fant ikke pakken" }, { status: 404 });
  return Response.json(build);
}
