import { PrismaClient } from "@prisma/client"
import { neonConfig } from "@neondatabase/serverless"
import { PrismaNeon } from "@prisma/adapter-neon"
import ws from "ws"

neonConfig.webSocketConstructor = ws

async function main() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter })

  const stores = await prisma.store.findMany({ select: { id: true, userId: true } })
  for (const s of stores) {
    const exists = await prisma.storeMember.findUnique({
      where: { storeId_userId: { storeId: s.id, userId: s.userId } },
    })
    if (!exists) {
      await prisma.storeMember.create({
        data: { storeId: s.id, userId: s.userId, role: "admin" },
      })
      console.log(`+ admin member store=${s.id} user=${s.userId}`)
    }
  }
  console.log(`Done. ${stores.length} stores`)
  await prisma.$disconnect()
}

main()
