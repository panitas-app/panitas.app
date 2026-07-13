const { execSync } = require("child_process")
const path = require("path")
const fs = require("fs")

const BACKUP_DIR = path.join(__dirname, "..", "backups")
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })

const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
const filename = `backup-${timestamp}.sql`
const filepath = path.join(BACKUP_DIR, filename)

try {
  console.log(`📦 Respaldando base de datos en ${filepath}...`)
  execSync(
    `docker exec panitas-postgres pg_dump -U panitas_user -d panitas_db --no-owner --no-privileges > "${filepath}"`,
    { stdio: "inherit", shell: true }
  )
  console.log(`✅ Respaldo exitoso: ${filename} (${(fs.statSync(filepath).size / 1024).toFixed(1)} KB)`)
} catch (e) {
  console.error("❌ Error al respaldar la base de datos:", e.message)
  process.exit(1)
}
