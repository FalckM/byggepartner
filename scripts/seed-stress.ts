// `pnpm seed:stress` — writes the deterministic 2 000-component stress catalog for /admin/stresstest.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateStressCatalog } from "../lib/stress/stressCatalog";

const catalog = generateStressCatalog();
const dir = join(__dirname, "..", "public", "stress");
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "catalog.json"), JSON.stringify(catalog));
const synthetic = catalog.filter((c) => c.source === "import:stress").length;
console.log(`✓ Stress catalog: ${synthetic} synthetic + ${catalog.length - synthetic} seed (OS/tilbehør) → public/stress/catalog.json`);
