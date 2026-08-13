import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"] || "",
    // Base de datos para "shadow" en operaciones de migraci��n (diff, dev).
    // Debe apuntar a una BD vac��a de escratch, nunca a la BD de la app.
    // Sin fallback a DATABASE_URL (D-04): en prod SHADOW_DATABASE_URL no existe
    // y el fallback rompia "prisma migrate deploy" (shadow == main). En local,
    // SHADOW_DATABASE_URL viene del .env.
    shadowDatabaseUrl: process.env["SHADOW_DATABASE_URL"] || "",
  },
});
