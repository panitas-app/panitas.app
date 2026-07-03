import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"

export async function GET() {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const now = new Date()
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalUsers, usersThisMonth,
    totalStores, totalOrders,
    pendingSubs, activeSubs, verifiedSubs, rejectedSubs, cancelledSubs, expiredSubs,
    totalRevenue,
    mrr,
    planDistribution,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: thisMonth } } }),
    prisma.store.count(),
    prisma.order.count(),
    prisma.storeSubscription.count({ where: { status: "pending" } }),
    prisma.storeSubscription.count({ where: { status: "active" } }),
    prisma.storeSubscription.count({ where: { status: "verified" } }),
    prisma.storeSubscription.count({ where: { status: "rejected" } }),
    prisma.storeSubscription.count({ where: { status: "cancelled" } }),
    prisma.storeSubscription.count({ where: { status: "expired" } }),
    prisma.storeSubscription.aggregate({ where: { status: { in: ["active", "verified"] } }, _sum: { amount: true } }),
    prisma.storeSubscription.aggregate({ where: { createdAt: { gte: thisMonth }, status: { in: ["active", "verified"] } }, _sum: { amount: true } }),
    prisma.storeSubscription.groupBy({ by: ["plan"], _count: true, _sum: { amount: true } }),
  ])

  const recentSubscriptions = await prisma.storeSubscription.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { store: { select: { name: true, slug: true } } },
  })

  return NextResponse.json({
    totalUsers,
    usersThisMonth,
    totalStores,
    totalOrders,
    pendingSubscriptions: pendingSubs,
    activeSubscriptions: activeSubs + verifiedSubs,
    verifiedSubscriptions: verifiedSubs,
    rejectedSubscriptions: rejectedSubs,
    cancelledSubscriptions: cancelledSubs,
    expiredSubscriptions: expiredSubs,
    totalRevenue: totalRevenue._sum.amount || 0,
    mrr: mrr._sum.amount || 0,
    planDistribution,
    recentSubscriptions,
  })
}
