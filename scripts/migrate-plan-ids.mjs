import { PrismaClient } from "@prisma/client"
import { neonConfig } from "@neondatabase/serverless"
import { PrismaNeon } from "@prisma/adapter-neon"
import ws from "ws"

neonConfig.webSocketConstructor = ws

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const LEGACY_MAP = {
  basico: "agenda",
  negocio: "comercio",
  empresarial: "mayorista",
  basic: "agenda",
  advanced: "comercio",
  reservas: "agenda",
  emprendedor: "comercio",
  free: "agenda",
}

async function main() {
  console.log("Migrando planIds legacy en Negocio...")
  let migrated = 0

  for (const [oldId, newId] of Object.entries(LEGACY_MAP)) {
    const result = await prisma.negocio.updateMany({
      where: { planId: oldId },
      data: { planId: newId },
    })
    if (result.count > 0) {
      console.log(`  ${oldId} -> ${newId}: ${result.count} negocios`)
      migrated += result.count
    }
  }

  console.log(`Total negocios migrados: ${migrated}`)

  console.log("Migrando planType legacy en Store...")
  for (const [oldType, newType] of Object.entries(LEGACY_MAP)) {
    const result = await prisma.store.updateMany({
      where: { planType: oldType },
      data: { planType: newType },
    })
    if (result.count > 0) {
      console.log(`  ${oldType} -> ${newType}: ${result.count} stores`)
    }
  }

  console.log("Migrando plan legacy en Store...")
  for (const [oldPlan, newPlan] of Object.entries(LEGACY_MAP)) {
    const result = await prisma.store.updateMany({
      where: { plan: oldPlan },
      data: { plan: newPlan },
    })
    if (result.count > 0) {
      console.log(`  ${oldPlan} -> ${newPlan}: ${result.count} stores`)
    }
  }

  console.log("Migración completada.")
}

main()
  .catch((e) => {
    console.error("Error:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
