import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") || "all"

  const where: any = {
    storeId: current.store.id,
    creditTerm: { not: null },
  }

  if (status === "pending") {
    where.installments = { some: { status: "pending" } }
  } else if (status === "late") {
    where.installments = { some: { status: "pending", dueDate: { lt: new Date() } } }
  } else if (status === "paid") {
    where.installments = { every: { status: "paid" } }
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      installments: { orderBy: { number: "asc" } },
      payments: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return NextResponse.json(orders)
}
