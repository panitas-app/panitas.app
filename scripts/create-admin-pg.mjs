import { PrismaClient } from "@prisma/client"
import { neonConfig } from "@neondatabase/serverless"
import { PrismaNeon } from "@prisma/adapter-neon"
import ws from "ws"
import bcrypt from "bcryptjs"

neonConfig.webSocketConstructor = ws

const dbUrl = process.env.DATABASE_URL ?? "postgresql://panitas_user:changeme@localhost:5432/panitas_db?schema=public"
const adapter = new PrismaNeon({ connectionString: dbUrl })
const prisma = new PrismaClient({ adapter })

async function run() {
  const email = "admin@panitas.com"
  const password = "admin"
  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: "superadmin", password: hashedPassword },
    create: { email, name: "Superadmin Principal", password: hashedPassword, role: "superadmin" },
  })

  console.log(`\n  ✓ Superadmin listo:`)
  console.log(`    Email:    ${email}`)
  console.log(`    Password: ${password}`)
  console.log()

  await prisma.$disconnect()
}

run().catch((err) => { console.error("Error:", err); prisma.$disconnect() })
