const { execSync } = require("child_process")
const path = require("path")
const fs = require("fs")

const BACKUP_DIR = path.join(__dirname, "..", "backups")
const LAST_BACKUP_FILE = path.join(BACKUP_DIR, ".last-backup-time")

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })

// Only backup once per day to avoid slowing down dev startup
const today = new Date().toISOString().slice(0, 10)

try {
  const lastBackup = fs.readFileSync(LAST_BACKUP_FILE, "utf8").trim()
  if (lastBackup === today) {
    // Already backed up today, skip
    process.exit(0)
  }
} catch {}

// Check if the DB container is running and has data
try {
  execSync("docker exec panitas-postgres pg_dump -U panitas_user -d panitas_db --no-owner --no-privileges -w 2>nul", {
    stdio: "pipe",
    shell: true,
    timeout: 10000,
  })
} catch {
  // DB not available, skip
  process.exit(0)
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
const filename = `auto-dev-${timestamp}.sql`
const filepath = path.join(BACKUP_DIR, filename)

try {
  execSync(
    `docker exec panitas-postgres pg_dump -U panitas_user -d panitas_db --no-owner --no-privileges > "${filepath}"`,
    { stdio: "pipe", shell: true, timeout: 30000 }
  )
  const size = (fs.statSync(filepath).size / 1024).toFixed(1)
  console.log(`📦 Backup diario automático: ${filename} (${size} KB)`)
  fs.writeFileSync(LAST_BACKUP_FILE, today, "utf8")
} catch {}
