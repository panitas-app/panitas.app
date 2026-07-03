import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

const dbUrl = process.env.DATABASE_URL ?? "postgresql://panitas_user:changeme@localhost:5432/panitas_db?schema=public"
const pool = new Pool({ connectionString: dbUrl })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({
  adapter,
})

const PLANS = [
  {
    id: "basico",
    nombre: "basico",
    label: "Básico",
    descripcion: "Elige una modalidad: Tienda o Agenda.",
    precioUsd: 15,
    precioUsdAnual: 150,
    activo: true,
    sortOrder: 1,
    features: ["productos_ilimitados", "crm", "automations", "dominio_propio"],
  },
  {
    id: "negocio",
    nombre: "negocio",
    label: "Negocio",
    descripcion: "Tienda y Agenda en una misma cuenta.",
    precioUsd: 25,
    precioUsdAnual: 250,
    activo: true,
    sortOrder: 2,
    features: ["crm", "automations"],
  },
  {
    id: "empresarial",
    nombre: "empresarial",
    label: "Empresarial",
    descripcion: "Sistema B2B para mayoristas.",
    precioUsd: 0,
    precioUsdAnual: 0,
    activo: false,
    sortOrder: 3,
    features: [],
  },
]

async function main() {
  console.log("🌱 Seeding plans...")

  for (const plan of PLANS) {
    const { features, ...planData } = plan
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: planData,
      create: planData,
    })

    for (const key of features) {
      await prisma.planFeature.upsert({
        where: { planId_key: { planId: plan.id, key } },
        update: { valor: "true" },
        create: { planId: plan.id, key, label: key, valor: "true" },
      })
    }
  }

  console.log("✅ Plans seeded successfully!")
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
