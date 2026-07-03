import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore } from "@/lib/permissions"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      payments: { include: { paymentAccount: true } },
      store: true,
    },
  })

  if (!order || order.storeId !== current.store.id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  return NextResponse.json(order)
}
