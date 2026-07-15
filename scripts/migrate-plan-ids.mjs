import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const LEGACY_MAP: Record<string, string> = {
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

  // Also migrate Store.planType if it has legacy values
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

  // Also migrate Store.plan if it has legacy values
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
