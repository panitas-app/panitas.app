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

  const orders = await prisma.order.findMany({
    where: {
      storeId: current.store.id,
      createdAt: { gte: startDate, lt: endDate },
    },
    select: {
      id: true,
      total: true,
      paymentStatus: true,
      creditTerm: true,
      posPin: true,
      shippingMethod: true,
      createdAt: true,
      payments: { select: { method: true, amount: true } },
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

  for (const order of orders) {
    const dateKey = new Date(order.createdAt.getTime() - tzOffsetMs).toISOString().split("T")[0]
    let day = dayMap.get(dateKey)
    if (!day) {
      day = { totalRevenue: 0, totalOrders: 0, paymentsBreakdown: {}, storeSales: 0, posSales: 0, creditSales: 0 }
      dayMap.set(dateKey, day)
    }
    day.totalRevenue += Number(order.total)
    day.totalOrders++
    if (order.posPin || order.shippingMethod === "pickup_store" || order.shippingMethod === "store") {
      day.posSales++
    } else {
      day.storeSales++
    }
    if (order.creditTerm) day.creditSales++
    for (const pm of order.payments) {
      day.paymentsBreakdown[pm.method] = (day.paymentsBreakdown[pm.method] || 0) + Number(pm.amount)
    }
  }

  const days = Array.from(dayMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json({ days, year })
}
