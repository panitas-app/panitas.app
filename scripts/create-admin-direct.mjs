import { PrismaClient } from "@prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import bcrypt from "bcryptjs"
import { join } from "path"

const DB_PATH = join(process.cwd(), "dev.db")

const adapter = new PrismaBetterSqlite3({
  url: `file:${DB_PATH}`,
})
const prisma = new PrismaClient({ adapter })

async function run() {
  const email = "admin@panitas.com"
  const password = "admin" // Contraseña predeterminada sencilla para desarrollo
  const hashedPassword = await bcrypt.hash(password, 10)
  
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: "superadmin",
      password: hashedPassword,
    },
    create: {
      email,
      name: "Superadmin Principal",
      password: hashedPassword,
      role: "superadmin",
    },
  })
  
  console.log("\n==================================================")
  console.log("  PANITAS — Superadmin Creado Exitosamente")
  console.log("==================================================")
  console.log(`  ✓ Usuario:   ${email}`)
  console.log(`  ✓ Password:  ${password}`)
  console.log("==================================================\n")
  
  await prisma.$disconnect()
}

run().catch((err) => {
  console.error("Error al crear superadmin directo:", err)
  prisma.$disconnect()
})
