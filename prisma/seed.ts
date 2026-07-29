import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { seedSalesData } from "../src/lib/crm/seed-data"

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  console.error("DATABASE_URL not set")
  process.exit(1)
}
const adapter = new PrismaPg({ connectionString: dbUrl })

const prisma = new PrismaClient({
  adapter,
})

const PLANS = [
  {
    id: "agenda",
    nombre: "agenda",
    label: "Agenda",
    descripcion: "Sistema de agendamiento inteligente para servicios por cita.",
    precioUsd: 15,
    precioUsdAnual: 150,
    activo: true,
    sortOrder: 1,
    features: [],
  },
  {
    id: "comercio",
    nombre: "comercio",
    label: "Emprendedor",
    descripcion: "Tienda online + administración para minoristas.",
    precioUsd: 25,
    precioUsdAnual: 250,
    activo: true,
    sortOrder: 2,
    features: [],
  },
  {
    id: "mayorista",
    nombre: "mayorista",
    label: "Mayorista",
    descripcion: "Sistema B2B para distribuidoras y mayoristas.",
    precioUsd: 45,
    precioUsdAnual: 450,
    activo: true,
    sortOrder: 3,
    features: [],
  },
  {
    id: "basico",
    nombre: "basico",
    label: "Básico",
    descripcion: "Legacy - reemplazado por Agenda",
    precioUsd: 15,
    precioUsdAnual: 150,
    activo: false,
    sortOrder: 10,
    features: [],
  },
  {
    id: "negocio",
    nombre: "negocio",
    label: "Negocio",
    descripcion: "Legacy - reemplazado por Emprendedor",
    precioUsd: 25,
    precioUsdAnual: 250,
    activo: false,
    sortOrder: 11,
    features: [],
  },
  {
    id: "empresarial",
    nombre: "empresarial",
    label: "Empresarial",
    descripcion: "Legacy - reemplazado por Mayorista",
    precioUsd: 35,
    precioUsdAnual: 350,
    activo: false,
    sortOrder: 12,
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

  console.log("🌱 Seeding sales data...")
  await seedSalesData(prisma)
  console.log("✅ Sales data seeded successfully!")
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
