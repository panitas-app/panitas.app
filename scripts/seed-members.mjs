import { PrismaClient } from "@prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.resolve(__dirname, "..", "dev.db")

const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
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
    console.log(`+ admin member`, s.id)
  }
}
console.log(`Done. ${stores.length} stores`)
await prisma.$disconnect()
