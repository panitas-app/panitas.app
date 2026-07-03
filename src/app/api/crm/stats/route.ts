import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore } from "@/lib/permissions"

export async function GET() {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const storeId = current.store.id
  const inactiveThreshold = new Date()
  inactiveThreshold.setMonth(inactiveThreshold.getMonth() - 3)

  const [total, recurrentes, inactivos, seguimientos] = await Promise.all([
    prisma.customer.count({ where: { storeId } }),
    prisma.customer.count({ where: { storeId, totalOrders: { gt: 1 } } }),
    prisma.customer.count({
      where: {
        storeId,
        OR: [{ lastPurchaseAt: null }, { lastPurchaseAt: { lt: inactiveThreshold } }],
      },
    }),
    prisma.customerFollowUp.count({ where: { storeId, status: "pending" } }),
  ])

  return NextResponse.json({ total, recurrentes, inactivos, seguimientos })
}
