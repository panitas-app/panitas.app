import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getEffectiveRate } from "@/lib/bcv"
import { getCurrentStore } from "@/lib/permissions"
import { rateLimit } from "@/lib/rate-limit"
import { CustomerService } from "@/services/customer.service"
import { buildMonthlySeries, monthKey } from "@/lib/business-intelligence-center"

export async function GET() {
  let storeInfo
  try {
    storeInfo = await getCurrentStore()
    if (!storeInfo) throw new Error("No tienes acceso a esta tienda")
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }

  const rl = await rateLimit(`analytics:${storeInfo.userId}`, 30, 60 * 1000)
  if (!rl.success) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta en ${Math.ceil(rl.resetIn / 1000)}s` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
    )
  }

  const rate = await getEffectiveRate()
  const storeId = storeInfo.store.id
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const baseWhere = { storeId }
  const nonCancelled = { storeId, status: { not: "cancelled" } }
  const monthNonCancelled = { ...nonCancelled, createdAt: { gte: monthStart } }

  const seriesStart = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  const [
    todayRevenue,
    weekRevenue,
    monthRevenue,
    totalRet,
    todayExp,
    weekExp,
    monthExp,
    totalExp,
    statusCounts,
    productAgg,
    recentOrders,
    monthOrders,
    monthlyPayments,
    monthlyExpenses,
    customerMetrics,
  ] = await Promise.all([
    // Revenue = suma de OrderPayment verificados (paidAt o createdAt fallback) en el período
    prisma.orderPayment.aggregate({
      where: { order: { storeId, status: { not: "cancelled" } }, status: "verified", OR: [{ paidAt: { gte: todayStart } }, { paidAt: null, createdAt: { gte: todayStart } }] },
      _sum: { amount: true },
    }),
    prisma.orderPayment.aggregate({
      where: { order: { storeId, status: { not: "cancelled" } }, status: "verified", OR: [{ paidAt: { gte: weekStart } }, { paidAt: null, createdAt: { gte: weekStart } }] },
      _sum: { amount: true },
    }),
    prisma.orderPayment.aggregate({
      where: { order: { storeId, status: { not: "cancelled" } }, status: "verified", OR: [{ paidAt: { gte: monthStart } }, { paidAt: null, createdAt: { gte: monthStart } }] },
      _sum: { amount: true },
    }),
    prisma.orderPayment.aggregate({
      where: { order: { storeId, status: { not: "cancelled" } }, status: "verified" },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({ where: { ...baseWhere, date: { gte: todayStart } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { ...baseWhere, date: { gte: weekStart } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { ...baseWhere, date: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: baseWhere, _sum: { amount: true } }),
    prisma.order.groupBy({ by: ["status"], where: baseWhere, _count: { id: true } }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { storeId, status: { not: "cancelled" } } },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    }),
    prisma.order.findMany({
      where: baseWhere,
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, orderNumber: true, customerName: true, status: true, total: true, createdAt: true },
    }),
    prisma.order.count({ where: monthNonCancelled }),
    prisma.orderPayment.findMany({
      where: { order: { storeId, status: { not: "cancelled" } }, status: "verified", OR: [{ paidAt: { gte: seriesStart } }, { paidAt: null, createdAt: { gte: seriesStart } }] },
      select: { amount: true, paidAt: true, createdAt: true },
    }),
    prisma.expense.findMany({
      where: { ...baseWhere, date: { gte: seriesStart } },
      select: { amount: true, date: true },
    }),
    new CustomerService().metrics({ storeId, userId: storeInfo.userId }),
  ])

  // Serie mensual (últimos 12 meses) para el área Análisis y la tendencia de Salud Financiera.
  const revenueByMonth: Record<string, number> = {}
  for (const payment of monthlyPayments) {
    const key = monthKey(payment.paidAt ?? payment.createdAt)
    revenueByMonth[key] = (revenueByMonth[key] ?? 0) + (payment.amount ?? 0)
  }
  const expensesByMonth: Record<string, number> = {}
  for (const expense of monthlyExpenses) {
    const key = monthKey(expense.date)
    expensesByMonth[key] = (expensesByMonth[key] ?? 0) + (expense.amount ?? 0)
  }
  const monthlySeries = buildMonthlySeries(revenueByMonth, expensesByMonth, 12, now)

  const productIds = productAgg.map((p) => p.productId)
  const productMap: Record<string, string> = {}
  if (productIds.length > 0) {
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    })
    for (const p of products) productMap[p.id] = p.name
  }

  const topProducts = productAgg.map((p) => ({
    name: productMap[p.productId] || "Producto eliminado",
    qty: p._sum.quantity || 0,
    revenue: p._sum.subtotal || 0,
  }))

  const statusCountMap: Record<string, number> = {}
  for (const s of statusCounts) statusCountMap[s.status] = s._count.id

  return NextResponse.json({
    todayRevenue: todayRevenue._sum.amount || 0,
    weekRevenue: weekRevenue._sum.amount || 0,
    monthRevenue: monthRevenue._sum.amount || 0,
    totalRevenue: totalRet._sum.amount || 0,
    todayExpenses: todayExp._sum.amount || 0,
    weekExpenses: weekExp._sum.amount || 0,
    monthExpenses: monthExp._sum.amount || 0,
    totalExpenses: totalExp._sum.amount || 0,
    rate,
    topProducts,
    statusCounts: statusCountMap,
    recentActivity: recentOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      status: o.status,
      total: o.total,
      createdAt: o.createdAt.toISOString(),
    })),
    totalOrders: statusCounts.reduce((sum, s) => sum + s._count.id, 0),
    monthOrders,
    averageTicketMonth: monthOrders > 0 ? (monthRevenue._sum.amount || 0) / monthOrders : 0,
    monthlySeries,
    customers: {
      total: customerMetrics.total,
      newThisMonth: customerMetrics.newThisMonth,
      recurrent: customerMetrics.recurrent,
      inactive: customerMetrics.inactive,
      averageCustomerValue: customerMetrics.averageCustomerValue,
      totalSpent: customerMetrics.totalSpent,
    },
  })
}
