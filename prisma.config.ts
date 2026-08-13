import "dotenv/config";
import { defineConfig } from "prisma/config";

// Sin fallback a DATABASE_URL (D-04): en prod SHADOW_DATABASE_URL no existe y el
// fallback rompia "prisma migrate deploy" (shadow == main). En local viene del .env.
const shadowDatabaseUrl = process.env["SHADOW_DATABASE_URL"] || undefined;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"] || "",
    ...(shadowDatabaseUrl ? { shadowDatabaseUrl } : {}),
  },
});
