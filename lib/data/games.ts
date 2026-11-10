import "server-only";
import { db } from "@/lib/db";
import { GameSchema, type Game } from "../engine/types";

export async function listGames(): Promise<Game[]> {
  const rows = await db.game.findMany({ orderBy: { name: "asc" } });
  return rows.map((g) =>
    GameSchema.parse({ ...g, iconUrl: g.iconUrl ?? undefined, fpsCap: g.fpsCap ?? undefined }),
  );
}
