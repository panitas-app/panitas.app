const { execSync } = require("child_process")
const path = require("path")
const fs = require("fs")

const BACKUP_DIR = path.join(__dirname, "..", "backups")

if (!fs.existsSync(BACKUP_DIR)) {
  console.error("❌ No existe el directorio de backups")
  process.exit(1)
}

const backups = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith(".sql")).sort().reverse()

if (backups.length === 0) {
  console.error("❌ No hay backups disponibles")
  process.exit(1)
}

console.log("Backups disponibles:")
backups.forEach((f, i) => {
  const stat = fs.statSync(path.join(BACKUP_DIR, f))
  console.log(`  ${i + 1}. ${f} (${(stat.size / 1024).toFixed(1)} KB - ${stat.mtime.toLocaleDateString()})`)
})

const idx = parseInt(process.argv[2] || "1") - 1
if (idx < 0 || idx >= backups.length) {
  console.error("❌ Índice inválido")
  process.exit(1)
}

const filename = backups[idx]
const filepath = path.join(BACKUP_DIR, filename)

console.log(`⚠️  Esto BORRARÁ todos los datos actuales y los reemplazará con ${filename}`)
console.log("Presiona Ctrl+C para cancelar o espera 5 segundos...")
const wait = new Promise(resolve => setTimeout(resolve, 5000))
wait.then(() => {
  try {
    console.log("\n🔄 Restaurando...")
    execSync(
      `echo "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" | docker exec -i panitas-postgres psql -U panitas_user -d panitas_db`,
      { stdio: "pipe", shell: true, timeout: 30000 }
    )
    execSync(
      `type "${filepath}" | docker exec -i panitas-postgres psql -U panitas_user -d panitas_db`,
      { stdio: "inherit", shell: true }
    )
    console.log("✅ Restauración exitosa")
  } catch (e) {
    console.error("❌ Error al restaurar:", e.message)
    process.exit(1)
  }
})
