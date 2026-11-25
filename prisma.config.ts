import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Not using env() so `prisma generate` works without a DATABASE_URL (CI, postinstall).
    url: process.env["DATABASE_URL"] ?? "",
  },
});
