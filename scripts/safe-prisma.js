#!/usr/bin/env node
const { execSync } = require("child_process")
const path = require("path")
const fs = require("fs")

const BACKUP_DIR = path.join(__dirname, "..", "backups")
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })

const DANGEROUS_COMMANDS = ["migrate dev", "migrate reset", "db push --force-reset", "migrate resolve"]
const WARN_COMMANDS = ["db push", "migrate deploy", "migrate status"]

const args = process.argv.slice(2).join(" ").trim().toLowerCase()

function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const filename = `pre-${args.replace(/\s+/g, "-")}-${timestamp}.sql`
  const filepath = path.join(BACKUP_DIR, filename)
  console.log(`\n📦 Respaldo automático en ${filename}...`)
  try {
    execSync(
      `docker exec panitas-postgres pg_dump -U panitas_user -d panitas_db --no-owner --no-privileges > "${filepath}"`,
      { stdio: "pipe", shell: true, timeout: 30000 }
    )
    const size = (fs.statSync(filepath).size / 1024).toFixed(1)
    console.log(`✅ Backup guardado: ${filename} (${size} KB)\n`)
  } catch (e) {
    console.error(`⚠️  No se pudo respaldar: ${e.message}`)
  }
}

// Block destructive commands
if (DANGEROUS_COMMANDS.some(cmd => args.startsWith(cmd))) {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  🚫 COMANDO BLOQUEADO POR SEGURIDAD                          ║
║                                                               ║
║  "${args}"                                            ║
║                                                               ║
║  Este comando DESTRUYE DATOS. Está terminantemente prohibido. ║
║                                                               ║
║  Usa en su lugar:                                             ║
║    npm run db:push    (seguro, con backup automático)         ║
║                                                               ║
║  Si NECESITAS este comando, haz backup manual con:            ║
║    npm run db:backup                                          ║
║  Luego edita scripts/safe-prisma.js y comenta la línea 39.    ║
╚═══════════════════════════════════════════════════════════════╝
  `)
  process.exit(1)
}

// Warn and backup for potentially destructive commands
if (WARN_COMMANDS.some(cmd => args.startsWith(cmd))) {
  console.log(`\n⚠️  Comando "${args}" puede modificar la BD`)
  backup()
}

// Pass through to the real prisma
const prismaArgs = process.argv.slice(2).join(" ")
try {
  execSync(`npx --yes prisma ${prismaArgs}`, { stdio: "inherit", shell: true })
} catch (e) {
  process.exit(e.status || 1)
}
