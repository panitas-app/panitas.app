import { PrismaClient } from "@prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.resolve(__dirname, "..", "dev.db")

const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
const prisma = new PrismaClient({ adapter })

const orders = await prisma.order.findMany({
  select: {
    id: true,
    storeId: true,
    customerName: true,
    customerPhone: true,
    customerEmail: true,
    customerAddress: true,
    customerCity: true,
    customerState: true,
    total: true,
    createdAt: true,
  },
})

const customerMap = new Map<string, { orders: typeof orders; storeId: string }>()

for (const o of orders) {
  const key = `${o.storeId}:${o.customerPhone}`
  if (!customerMap.has(key)) {
    customerMap.set(key, { orders: [], storeId: o.storeId })
  }
  customerMap.get(key)!.orders.push(o)
}

let created = 0
for (const [, data] of customerMap) {
  const first = data.orders[0]
  const totalSpent = data.orders.reduce((s, o) => s + o.total, 0)
  const lastDate = data.orders.reduce((latest, o) =>
    o.createdAt > latest ? o.createdAt : latest, data.orders[0].createdAt
  )

  const existing = await prisma.customer.findUnique({
    where: { storeId_phone: { storeId: data.storeId, phone: first.customerPhone } },
  })

  if (!existing) {
    await prisma.customer.create({
      data: {
        storeId: data.storeId,
        name: first.customerName,
        phone: first.customerPhone,
        email: first.customerEmail,
        address: first.customerAddress,
        city: first.customerCity,
        state: first.customerState,
        totalSpent,
        totalOrders: data.orders.length,
        lastPurchaseAt: lastDate,
      },
    })
    created++
  }
}

// Link orders to customers
for (const o of orders) {
  const customer = await prisma.customer.findUnique({
    where: { storeId_phone: { storeId: o.storeId, phone: o.customerPhone } },
  })
  if (customer) {
    await prisma.order.update({
      where: { id: o.id },
      data: { customerId: customer.id },
    })
  }
}

console.log(`Created ${created} customers, linked ${orders.length} orders`)
await prisma.$disconnect()
