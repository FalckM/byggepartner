import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // `server-only` throws outside React Server Components; make it a no-op in tests.
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/engine/**/*.ts"],
      reporter: ["text", "html"],
      // Phase 2 gate: ≥ 95 % line coverage on the rules; the whole engine stays high too.
      thresholds: {
        "lib/engine/rules/**": { lines: 95, functions: 95 },
        "lib/engine/**": { lines: 90 },
      },
    },
  },
});
