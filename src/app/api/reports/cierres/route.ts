import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore } from "@/lib/permissions"

export async function GET(request: Request) {
  const current = await getCurrentStore()
  if (!current) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()))
  const tzOffset = parseInt(searchParams.get("tzOffset") || "0")
  const tzOffsetMs = tzOffset * 60 * 1000

  const startDate = new Date(`${year}-01-01T00:00:00.000Z`)
  const endDate = new Date(`${year + 1}-01-01T00:00:00.000Z`)

  // Traer órdenes con sus pagos y cuotas
  const orders = await prisma.order.findMany({
    where: {
      storeId: current.store.id,
      createdAt: { gte: startDate, lt: endDate },
      status: { not: "cancelled" },
    },
    select: {
      id: true,
      total: true,
      paymentStatus: true,
      creditTerm: true,
      posPin: true,
      shippingMethod: true,
      createdAt: true,
      payments: { select: { id: true, method: true, amount: true, status: true, paidAt: true, createdAt: true } },
      installments: { select: { status: true, paidAmount: true, amount: true, paidAt: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  const dayMap = new Map<string, {
    totalRevenue: number
    totalOrders: number
    paymentsBreakdown: Record<string, number>
    storeSales: number
    posSales: number
    creditSales: number
  }>()

  // Helper: obtener fecha (YYYY-MM-DD) shifting por tzOffset
  const toDateKey = (d: Date) => new Date(d.getTime() - tzOffsetMs).toISOString().split("T")[0]

  for (const order of orders) {
    const createdKey = toDateKey(order.createdAt)
    let createdDay = dayMap.get(createdKey)
    if (!createdDay) {
      createdDay = { totalRevenue: 0, totalOrders: 0, paymentsBreakdown: {}, storeSales: 0, posSales: 0, creditSales: 0 }
      dayMap.set(createdKey, createdDay)
    }
    createdDay.totalOrders++
    if (order.posPin || order.shippingMethod === "pickup_store" || order.shippingMethod === "store") {
      createdDay.posSales++
    } else {
      createdDay.storeSales++
    }
    if (order.creditTerm) createdDay.creditSales++

    // Para órdenes a crédito, el dinero se contabiliza por cada pago efectivo;
    // las cuotas pendientes no suman al balance hoy.
    if (order.creditTerm) {
      for (const pm of order.payments) {
        if (pm.status !== "verified") continue
        const pmDate = pm.paidAt || pm.createdAt
        const pmKey = toDateKey(pmDate)
        let day = dayMap.get(pmKey)
        if (!day) {
          day = { totalRevenue: 0, totalOrders: 0, paymentsBreakdown: {}, storeSales: 0, posSales: 0, creditSales: 0 }
          dayMap.set(pmKey, day)
        }
        day.totalRevenue += Number(pm.amount)
        day.paymentsBreakdown[pm.method] = (day.paymentsBreakdown[pm.method] || 0) + Number(pm.amount)
      }
    } else {
      // Órdenes normales: contabilizar por pagos verificados
      for (const pm of order.payments) {
        if (pm.status !== "verified") continue
        const pmDate = pm.paidAt || pm.createdAt
        const pmKey = toDateKey(pmDate)
        let day = dayMap.get(pmKey)
        if (!day) {
          day = { totalRevenue: 0, totalOrders: 0, paymentsBreakdown: {}, storeSales: 0, posSales: 0, creditSales: 0 }
          dayMap.set(pmKey, day)
        }
        day.totalRevenue += Number(pm.amount)
        day.paymentsBreakdown[pm.method] = (day.paymentsBreakdown[pm.method] || 0) + Number(pm.amount)
      }
    }
  }

  const days = Array.from(dayMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json({ days, year })
}
