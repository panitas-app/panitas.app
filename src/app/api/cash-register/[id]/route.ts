import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore } from "@/lib/permissions"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params

  const session = await prisma.cashRegisterSession.findFirst({
    where: { id, storeId: current.store.id },
    include: {
      orders: {
        include: {
          items: true,
          payments: true,
          customer: true,
          installments: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  })
  if (!session) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

  return NextResponse.json(session)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const session = await prisma.cashRegisterSession.findFirst({
    where: { id, storeId: current.store.id, status: "open" },
  })
  if (!session) return NextResponse.json({ error: "Caja no encontrada o ya cerrada" }, { status: 400 })

  if (body.action === "close") {
    // Fetch all linked orders to calculate totals
    const orders = await prisma.order.findMany({
      where: { cashRegisterSessionId: id },
      include: { payments: true, installments: true },
    })

    let totalCash = 0; let totalTransfer = 0; let totalPagoMovil = 0
    let totalCredit = 0
    let totalSales = 0; let totalOrders = orders.length

    for (const order of orders) {
      totalSales += order.total
      for (const pm of order.payments) {
        switch (pm.method) {
          case "cash": totalCash += pm.amount; break
          case "bank_transfer": totalTransfer += pm.amount; break
          case "pago_movil": totalPagoMovil += pm.amount; break
        }
      }
      for (const inst of order.installments) {
        if (inst.status === "pending") totalCredit += inst.amount
      }
    }

    const updated = await prisma.cashRegisterSession.update({
      where: { id },
      data: {
        status: "closed",
        closedAt: new Date(),
        closedBy: current.userId,
        notes: body.notes || null,
        totalCash, totalTransfer, totalPagoMovil, totalCredit,
        totalSales, totalOrders,
      },
    })
    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
}
