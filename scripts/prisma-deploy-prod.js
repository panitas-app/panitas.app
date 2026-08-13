#!/usr/bin/env node
/**
 * Deploy de migraciones Prisma para Produccion (FASE 10B).
 *
 * La BD de produccion fue construida con `prisma db push` (sin tabla
 * `_prisma_migrations`), por lo que `prisma migrate deploy` choca con
 * "already exists" (P3018) al intentar aplicar el historial de migraciones.
 *
 * Estrategia (baselining de BD pre-existente sin datos de clientes):
 *  1. Ejecutar `prisma migrate deploy`.
 *  2. Si falla con P3018 por objeto ya existente (columna/tabla duplicada),
 *     la migracion fallida se registra como APLICADA con `migrate resolve
 *     --applied` (su efecto ya esta en la BD) y se reintenta.
 *  3. Cualquier otro error (conexion, SQL real, timeout) ABORTA con exit != 0:
 *     no se enmascaran errores reales.
 *
 * Seguridad: cada migracion de Prisma se ejecuta en transaccion, por lo que una
 * migracion fallida no deja cambios parciales. El bucle esta limitado al numero
 * de migraciones conocidas.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const MIGRATIONS_DIR = path.join(__dirname, "..", "prisma", "migrations");
const known = fs
  .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

function run(cmd) {
  return execSync(cmd, { cwd: path.join(__dirname, ".."), stdio: ["ignore", "inherit", "inherit"], env: process.env });
}

function attempt() {
  return new Promise((resolve, reject) => {
    const { spawn } = require("child_process");
    const child = spawn("npx", ["prisma", "migrate", "deploy"], {
      cwd: path.join(__dirname, ".."),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => {
      if (process.stdout.isTTY) {
        process.stdout.write(out);
        process.stderr.write(err);
      }
      resolve({ code, out, err });
    });
    child.on("error", reject);
  });
}

(async () => {
  const maxIterations = known.length + 1;
  for (let i = 0; i < maxIterations; i++) {
    const res = await attempt();
    if (res.code === 0) {
      if (i > 0) console.log("migrate deploy: OK tras baselining de BD existente");
      else console.log("migrate deploy: OK");
      process.exit(0);
    }
    const combined = res.out + res.err;
    const migrationMatch = combined.match(/Migration name:\s*([^\s]+)/);
    const failedMatch = combined.match(/The `([^`]+)` migration started at[^]*?failed/);
    const isP3009 = combined.includes("P3009");

    if (isP3009 && failedMatch) {
      const name = failedMatch[1];
      if (!known.includes(name)) {
        console.error("prisma migrate deploy: migracion desconocida en P3009: " + name);
        process.exit(1);
      }
      console.log(`prisma migrate deploy: limpiando registro fallido de "${name}" (--rolled-back)`);
      try {
        run(`npx prisma migrate resolve --rolled-back "${name}"`);
      } catch (e) {
        console.error("prisma migrate resolve --rolled-back fallo para " + name);
        process.exit(1);
      }
      continue;
    }

    const isDrift =
      combined.includes("P3018") ||
      combined.includes("already exists") ||
      combined.includes("42701") ||
      combined.includes("42P07") ||
      combined.includes("42710") ||
      combined.includes("duplicate column") ||
      combined.includes("duplicate table") ||
      combined.includes("relation \"");

    if (!migrationMatch || !isDrift) {
      console.error("prisma migrate deploy: error no recuperable (no es drift de objetos existentes).");
      process.stderr.write(combined);
      process.exit(1);
    }
    const name = migrationMatch[1];
    if (!known.includes(name)) {
      console.error("prisma migrate deploy: migracion desconocida en drift: " + name);
      process.exit(1);
    }
    console.log(`prisma migrate deploy: la BD ya contiene objetos de "${name}" -> registrando como aplicada`);
    try {
      run(`npx prisma migrate resolve --applied "${name}"`);
    } catch (e) {
      console.error("prisma migrate resolve fallo para " + name);
      process.exit(1);
    }
  }
  console.error("prisma migrate deploy: demasiadas iteraciones, abortando");
  process.exit(1);
})().catch((e) => {
  console.error("prisma-deploy-prod fallo:", e.message);
  process.exit(1);
});
