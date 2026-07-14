import { PrismaClient } from "@prisma/client"
import { neonConfig } from "@neondatabase/serverless"
import { PrismaNeon } from "@prisma/adapter-neon"
import ws from "ws"
import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
neonConfig.webSocketConstructor = ws

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const jsonPath = path.resolve(__dirname, "..", "data", "agencias_venezuela.json")
  const agencies = JSON.parse(fs.readFileSync(jsonPath, "utf-8"))

  console.log(`Cargando ${agencies.length} agencias...`)

  // Clear existing
  await prisma.agenciaEnvio.deleteMany()

  // Batch insert
  let count = 0
  for (const a of agencies) {
    await prisma.agenciaEnvio.create({
      data: {
        empresa: a.empresa,
        estado: a.estado,
        ciudad: a.ciudad || "",
        agencia: a.agencia,
        direccion: a.direccion || "",
        telefono1: a.telefono_1 || "",
        telefono2: a.telefono_2 || "",
        whatsapp: a.whatsapp || "",
        email: a.email || "",
        horario: a.horario || "",
        latitud: a.latitud || "",
        longitud: a.longitud || "",
        urlFuente: a.url_fuente || "",
      },
    })
    count++
    if (count % 100 === 0) console.log(`  ${count}/${agencies.length}`)
  }

  console.log(`✅ ${count} agencias insertadas.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
