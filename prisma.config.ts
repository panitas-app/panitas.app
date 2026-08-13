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
    // Base de datos para "shadow" en operaciones de migración (diff, dev).
    // Debe apuntar a una BD vacía de escratch, nunca a la BD de la app.
    shadowDatabaseUrl:
      process.env["SHADOW_DATABASE_URL"] || process.env["DATABASE_URL"] || "",
  },
});
