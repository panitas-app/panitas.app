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
    const closedAt = new Date()
    try {
      // Cierre atómico (FASE 8G): los totales se calculan y el cambio de estado se
      // hace en la misma transacción. El `updateMany` condicional sobre `status:
      // "open"` impide el doble cierre bajo concurrencia.
      const updated = await prisma.$transaction(async (tx) => {
        const orders = await tx.order.findMany({
          where: { cashRegisterSessionId: id, status: { not: "cancelled" } },
          include: { payments: true, installments: true },
        })

        let totalCash = 0; let totalTransfer = 0; let totalPagoMovil = 0
        let totalBinancePay = 0; let totalCard = 0; let totalDivisas = 0
        let totalCredit = 0
        let totalSales = 0; const totalOrders = orders.length

        for (const order of orders) {
          totalSales += order.total
          for (const pm of order.payments) {
            // Solo pagos verificados: una transferencia pendiente aún no es cobro.
            if (pm.status !== "verified") continue
            switch (pm.method) {
              case "cash": totalCash += pm.amount; break
              case "bank_transfer": totalTransfer += pm.amount; break
              case "pago_movil": totalPagoMovil += pm.amount; break
              case "binancepay": totalBinancePay += pm.amount; break
              case "card": totalCard += pm.amount; break
              case "divisas": totalDivisas += pm.amount; break
            }
          }
          // Por cobrar = cuotas no pagadas (monto total menos lo ya abonado).
          for (const inst of order.installments) {
            if (inst.status === "paid") continue
            totalCredit += inst.amount - (inst.paidAmount ?? 0)
          }
        }

        const flipped = await tx.cashRegisterSession.updateMany({
          where: { id, storeId: current.store.id, status: "open" },
          data: {
            status: "closed",
            closedAt,
            closedBy: current.userId,
            notes: body.notes || null,
            totalCash, totalTransfer, totalPagoMovil, totalBinancePay, totalCard, totalDivisas,
            totalCredit, totalSales, totalOrders,
          },
        })
        if (flipped.count === 0) {
          throw new Error("Caja ya cerrada")
        }
        return tx.cashRegisterSession.findUnique({ where: { id } })
      })
      return NextResponse.json(updated)
    } catch (e: any) {
      return NextResponse.json(
        { error: e?.message === "Caja ya cerrada" ? "Caja ya cerrada" : "No se pudo cerrar la caja. Intenta nuevamente." },
        { status: 400 }
      )
    }
  }

  return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
}
