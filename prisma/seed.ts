// `pnpm db:seed` — validates all seed JSON with Zod, then upserts into Postgres.
// Fails loudly (exit 1) with every Zod issue listed if the data is invalid.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../lib/generated/prisma/client";
import { loadSeedCatalog, loadSeedGames, loadSeedScenarios, SeedValidationError } from "../lib/data/seedData";

async function main() {
  const t0 = performance.now();
  let catalog, games, scenarios;
  try {
    catalog = loadSeedCatalog();
    games = loadSeedGames();
    scenarios = loadSeedScenarios();
  } catch (err) {
    if (err instanceof SeedValidationError) console.error(`✗ ${err.message}`);
    else console.error("✗ Seed validation failed:", err);
    process.exit(1);
  }
  console.log(`✓ Zod OK: ${catalog.length} components, ${games.length} games, ${scenarios.length} scenarios`);

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set – see .env.example");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    await prisma.$transaction(async (tx) => {
      for (const c of catalog) {
        const data = {
          category: c.category,
          brand: c.brand,
          name: c.name,
          priceNok: c.priceNok,
          stock: c.stock,
          deliveryDays: c.deliveryDays,
          imageUrl: c.imageUrl ?? null,
          plainSummary: c.plainSummary,
          tierLabel: c.tierLabel ?? null,
          specs: c.specs as Prisma.InputJsonValue,
          source: c.source,
          isDemoData: c.isDemoData,
          incompleteForValidation: c.incompleteForValidation,
        };
        await tx.component.upsert({ where: { id: c.id }, create: { id: c.id, ...data }, update: data });
      }
      // Remove seed components that were deleted from the JSON (imports are left untouched).
      const removed = await tx.component.deleteMany({
        where: { source: "seed", id: { notIn: catalog.map((c) => c.id) } },
      });
      if (removed.count) console.log(`  removed ${removed.count} stale seed component(s)`);

      for (const g of games) {
        const data = { ...g, iconUrl: g.iconUrl ?? null, fpsCap: g.fpsCap ?? null };
        await tx.game.upsert({ where: { id: g.id }, create: data, update: data });
      }
    }, { timeout: 60_000 });

    const counts = await prisma.component.groupBy({ by: ["category"], _count: true, orderBy: { category: "asc" } });
    console.log("  " + counts.map((r) => `${r.category}: ${r._count}`).join(" · "));
    console.log(`✓ Seeded in ${Math.round(performance.now() - t0)} ms`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
