import { getCurrentStore } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { OrdersList } from "@/components/dashboard/orders-list"
import { startOfLocalDay } from "@/lib/date-ranges"

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>
}) {
  const current = await getCurrentStore()
  if (!current) redirect("/choose-plan")

  const params = await searchParams

  let metrics = { todayCount: 0, todayTotal: 0, avgTicket: 0, pendingPayment: 0, credit: 0 }
  try {
    const dayStart = startOfLocalDay(new Date().toISOString().slice(0, 10))
    const [todayCount, todayAgg, pendingPayment, credit] = await Promise.all([
      prisma.order.count({
        where: { storeId: current.store.id, createdAt: { gte: dayStart } },
      }),
      prisma.order.aggregate({
        where: { storeId: current.store.id, createdAt: { gte: dayStart } },
        _sum: { total: true },
      }),
      prisma.order.count({
        where: { storeId: current.store.id, status: { not: "cancelled" }, paymentStatus: "pending" },
      }),
      prisma.order.count({
        where: {
          storeId: current.store.id,
          status: { not: "cancelled" },
          paymentStatus: { in: ["credit", "partial"] },
        },
      }),
    ])
    const todayTotal = todayAgg._sum.total ?? 0
    metrics = {
      todayCount,
      todayTotal,
      avgTicket: todayCount > 0 ? todayTotal / todayCount : 0,
      pendingPayment,
      credit,
    }
  } catch (e) {
    console.error("[orders page] metrics", e)
  }

  return (
    <div className="p-4 md:p-6">
      <OrdersList metrics={metrics} initialOrderId={params.orderId} />
    </div>
  )
}
