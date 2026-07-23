import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get("date")

  const day = dateParam ? new Date(dateParam) : new Date()
  day.setHours(0, 0, 0, 0)
  const nextDay = new Date(day)
  nextDay.setDate(nextDay.getDate() + 1)

  const orders = await prisma.order.findMany({
    where: {
      storeId: current.store.id,
      createdAt: { gte: day, lt: nextDay },
    },
    include: {
      items: true,
      payments: true,
      installments: { orderBy: { number: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  })

  const totalRevenue = orders
    .map((o) => (o.creditTerm
      ? (o.downPayment ?? 0) + o.installments.filter((i) => i.status === "paid").reduce((s, i) => s + (i.paidAmount ?? i.amount), 0)
      : o.payments.filter((p) => p.status === "verified").reduce((s, p) => s + p.amount, 0)
    ))
    .reduce((s, x) => s + x, 0)
  const totalOrders = orders.length
  const paymentsBreakdown: Record<string, number> = {}
  let storeSales = 0
  let posSales = 0
  let creditSales = 0
  for (const o of orders) {
    if (o.shippingMethod === "pickup_store" || o.shippingMethod === "store" || o.posPin) posSales++
    else storeSales++
    if (o.creditTerm) creditSales++
    for (const p of o.payments) {
      if (p.status !== "verified") continue
      paymentsBreakdown[p.method] = (paymentsBreakdown[p.method] || 0) + p.amount
    }
  }

  return NextResponse.json({
    date: day.toISOString().split("T")[0],
    totalRevenue,
    totalOrders,
    paymentsBreakdown,
    storeSales,
    posSales,
    creditSales,
    orders,
  })
}
