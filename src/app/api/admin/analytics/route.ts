import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"

export async function GET() {
  try {
    const admin = await getLocalSuperadmin()
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const [
      totalUsers, usersThisMonth,
      totalStores,
      totalOrders,
      pendingSubs, activeSubs, verifiedSubs, rejectedSubs,
      thisMonthRevenue, lastMonthRevenue,
      subscriptionsByPlan,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: thisMonth } } }),
      prisma.store.count(),
      prisma.order.count(),
      prisma.storeSubscription.count({ where: { status: "pending" } }),
      prisma.storeSubscription.count({ where: { status: "active" } }),
      prisma.storeSubscription.count({ where: { status: "verified" } }),
      prisma.storeSubscription.count({ where: { status: "rejected" } }),
      prisma.storeSubscription.aggregate({ where: { createdAt: { gte: thisMonth }, status: { in: ["active", "verified"] } }, _sum: { amount: true } }),
      prisma.storeSubscription.aggregate({ where: { createdAt: { gte: lastMonth, lt: thisMonth }, status: { in: ["active", "verified"] } }, _sum: { amount: true } }),
      prisma.storeSubscription.groupBy({ by: ["plan"], _count: true }),
    ])

    const mrr = thisMonthRevenue._sum.amount || 0
    const prevMrr = lastMonthRevenue._sum.amount || 0
    const churned = await prisma.storeSubscription.count({
      where: { status: "cancelled", updatedAt: { gte: thisMonth } },
    })
    const totalAtStart = await prisma.storeSubscription.count({
      where: { status: { in: ["active", "verified"] }, createdAt: { lt: thisMonth } },
    })
    const churnRate = totalAtStart > 0 ? ((churned / totalAtStart) * 100).toFixed(1) : "0"

    const revenueByPlan = await Promise.all(
      ["basico", "negocio", "empresarial", "free", "basic", "advanced"].map(async (plan) => {
        const agg = await prisma.storeSubscription.aggregate({
          where: { plan, createdAt: { gte: thisMonth }, status: { in: ["active", "verified"] } },
          _sum: { amount: true },
        })
        return { plan, revenue: agg._sum.amount || 0 }
      }),
    )

    const bcvHistory = await prisma.bcvRate.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { rate: true, createdAt: true },
    })

    const topStores = await prisma.store.findMany({
      select: {
        id: true, name: true, slug: true, planType: true,
        user: { select: { name: true, email: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    })

    const storeRevenue = await Promise.all(
      topStores.map(async (s) => {
        const agg = await prisma.order.aggregate({ where: { storeId: s.id }, _sum: { total: true } })
        return { ...s, totalRevenue: agg._sum.total || 0 }
      }),
    )

    storeRevenue.sort((a, b) => b.totalRevenue - a.totalRevenue)

    const recentActivity = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    const expiringSoon = await prisma.storeSubscription.findMany({
      where: {
        status: { in: ["active", "verified"] },
        endDate: { lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
      },
      include: { store: { select: { name: true } } },
      orderBy: { endDate: "asc" },
      take: 10,
    })

    return NextResponse.json({
      totalUsers,
      usersThisMonth,
      totalStores,
      totalOrders,
      pendingSubs,
      activeSubs,
      verifiedSubs,
      rejectedSubs,
      mrr,
      prevMrr,
      mrrGrowth: prevMrr > 0 ? (((mrr - prevMrr) / prevMrr) * 100).toFixed(1) : "0",
      churnRate: parseFloat(churnRate),
      churned,
      subscriptionsByPlan,
      revenueByPlan,
      bcvHistory,
      topStores: storeRevenue,
      recentActivity: recentActivity.map(a => ({
        id: a.id,
        action: a.action,
        entity: a.entity,
        createdAt: a.createdAt,
        userId: (a as any).userId,
      })),
      expiringSoon,
    })
  } catch (error) {
    console.error("[admin analytics error]", error)
    return NextResponse.json({ error: "Error al cargar analytics" }, { status: 500 })
  }
}
