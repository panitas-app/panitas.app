import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { createAuditEntry } from "@/lib/audit"

export async function GET(request: NextRequest) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get("orderId")
  const status = searchParams.get("status")

  const where: any = { order: { storeId: current.store.id } }
  if (orderId) where.orderId = orderId
  if (status) where.status = status

  const installments = await prisma.installment.findMany({
    where,
    include: { order: { select: { orderNumber: true, customerName: true, total: true } } },
    orderBy: { dueDate: "asc" },
  })
  return NextResponse.json(installments)
}

export async function PATCH(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const { id, paidAmount } = body

    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 })

    const installment = await prisma.installment.findUnique({
      where: { id },
      include: { order: { select: { storeId: true } } },
    })
    if (!installment || installment.order.storeId !== current.store.id) {
      return NextResponse.json({ error: "Cuota no encontrada" }, { status: 404 })
    }
    if (installment.status === "paid") {
      return NextResponse.json({ error: "Cuota ya pagada" }, { status: 400 })
    }

    const updated = await prisma.installment.update({
      where: { id },
      data: {
        status: "paid",
        paidAt: new Date(),
        paidAmount: paidAmount ? parseFloat(paidAmount) : installment.amount,
      },
    })

    await createAuditEntry({
      action: "installment.paid",
      entity: "Installment",
      entityId: updated.id,
      metadata: { orderId: installment.orderId, number: updated.number, amount: updated.amount },
      storeId: current.store.id,
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error al actualizar cuota" }, { status: 500 })
  }
}
