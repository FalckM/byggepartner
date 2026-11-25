// Spec 0.3 / 5 — the engine is pure TypeScript: no imports from next, prisma or react.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "../../lib/engine");
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith(".ts") ? [p] : [];
  });

describe("engine purity", () => {
  it.each(files(ROOT).map((f) => [f.slice(ROOT.length + 1), f]))("%s has no framework imports", (_, file) => {
    const src = readFileSync(file, "utf8");
    const imports = [...src.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
    for (const spec of imports) {
      expect(spec, `${file} imports ${spec}`).not.toMatch(/^(next|react|react-dom|@prisma|server-only)(\/|$)|^@\/lib\/(db|generated)/);
    }
  });
});
