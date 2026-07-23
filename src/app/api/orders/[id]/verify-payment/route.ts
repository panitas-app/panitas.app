import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/permissions"
import { sendEmail } from "@/lib/email"
import { templateOrderPaymentVerified } from "@/lib/email-templates"
import { csrfGuard } from "@/lib/csrf"
import { createAuditEntry } from "@/lib/audit"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  try {
    const current = await requireRole(["admin", "manager"])
    const { id } = await params
    const body = await request.json()
    const { paymentId, orderStatus } = body

    const order = await prisma.order.findUnique({
      where: { id },
      include: { payments: true },
    })

    if (!order || order.storeId !== current.store.id) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const payment = order.payments.find((p) => p.id === paymentId)
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    await prisma.orderPayment.update({
      where: { id: paymentId },
      data: { status: "verified" },
    })

    // NOTE: update + include triggers interactive transactions in Neon HTTP — do them separately
    await prisma.order.update({
      where: { id },
      data: {
        paymentStatus: "paid",
        status: orderStatus || "confirmed",
      },
    })

    const updated = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        payments: { include: { paymentAccount: true } },
        store: true,
      },
    })

    if (!updated) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    await createAuditEntry({ action: "payment.verified", entity: "OrderPayment", entityId: paymentId, storeId: current.store.id, userId: current.userId })

    if (updated.customerEmail) {
      sendEmail(
        updated.customerEmail,
        "Pago verificado — Panitas",
        templateOrderPaymentVerified(updated.customerName, updated.orderNumber, updated.store.name),
        "payment_verified"
      ).catch(e => console.error("Email error:", e))
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    if (error?.message?.includes("No tienes")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Verify payment error:", error)
    return NextResponse.json(
      { error: error?.message || "Error al verificar el pago" },
      { status: 500 }
    )
  }
}
