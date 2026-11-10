// `pnpm analytics:reset` — deletes ALL events and test sessions (e.g. before a real user test round).
// Refuses to touch a non-local database unless --yes-really is passed.
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  if (!local && !process.argv.includes("--yes-really")) {
    console.error("✗ DATABASE_URL er ikke lokal. Legg til --yes-really hvis du virkelig vil slette analysedata der.");
    process.exit(1);
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const [events, sessions] = await Promise.all([prisma.event.count(), prisma.testSession.count()]);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`Slette ${events} hendelser og ${sessions} testøkter? Skriv «slett» for å bekrefte: `);
  rl.close();
  if (answer.trim() !== "slett") {
    console.log("Avbrutt – ingenting slettet.");
  } else {
    await prisma.$transaction([prisma.event.deleteMany(), prisma.testSession.deleteMany()]);
    console.log(`✓ Slettet ${events} hendelser og ${sessions} testøkter.`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
