import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { csrfGuard } from "@/lib/csrf"
import { enviar2doPagoConfirmado } from "@/lib/email"
import { formatDate } from "@/lib/email-helpers"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(req)
  if (csrf) return csrf

  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await params

  const subscription = await prisma.storeSubscription.findUnique({ where: { id } })
  if (!subscription) {
    return NextResponse.json({ error: "Suscripción no encontrada" }, { status: 404 })
  }

  if (subscription.paymentMode !== "installment") {
    return NextResponse.json({ error: "Esta suscripción no usa pago en cuotas" }, { status: 400 })
  }

  if (subscription.secondPaymentPaid) {
    return NextResponse.json({ error: "La segunda cuota ya fue pagada" }, { status: 400 })
  }

  const body = await req.json()
  const { reference, bankOrigin, paidAt, receiptImage, paymentType } = body

  // paymentType: "installment" (2nd cuota, +15 days) or "full" (upgrade to full payment, +30 days)
  const isFullPayment = paymentType === "full"
  const daysToAdd = isFullPayment ? 30 : 15

  const now = new Date()

  // Update subscription: mark 2nd payment paid
  const updateData: any = {
    secondPaymentPaid: true,
    secondPaymentPaidAt: paidAt ? new Date(paidAt) : now,
    secondPaymentReference: reference || null,
    secondPaymentBankOrigin: bankOrigin || null,
    secondPaymentReceipt: receiptImage || null,
  }

  if (subscription.status === "active" && subscription.endDate) {
    const extendedEnd = new Date(subscription.endDate)
    extendedEnd.setDate(extendedEnd.getDate() + daysToAdd)
    updateData.endDate = extendedEnd
    if (isFullPayment) {
      updateData.paymentMode = "single"
      updateData.amount = subscription.amount + (subscription.installmentAmount || 0)
    }
  }

  await prisma.storeSubscription.update({ where: { id }, data: updateData })

  // Update Negocio.planVencimiento — add days to remaining
  const store = await prisma.store.findUnique({ where: { id: subscription.storeId }, select: { negocioId: true } })
  if (store?.negocioId) {
    const negocio = await prisma.negocio.findUnique({ where: { id: store.negocioId }, select: { planVencimiento: true, planEstado: true } })
    if (negocio?.planEstado === "activo") {
      const base = negocio.planVencimiento && negocio.planVencimiento > now ? negocio.planVencimiento : now
      const newEnd = new Date(base)
      newEnd.setDate(newEnd.getDate() + daysToAdd)
      await prisma.negocio.update({
        where: { id: store.negocioId },
        data: { planVencimiento: newEnd },
      })
    }
  }

  const updated = await prisma.storeSubscription.findUnique({ where: { id } })

  // Send second payment confirmed email
  if (updated && updated.status === "active" && updated.endDate) {
    const storeInfo = await prisma.store.findUnique({ where: { id: updated.storeId }, select: { name: true, userId: true } })
    if (storeInfo?.userId) {
      const owner = await prisma.user.findUnique({ where: { id: storeInfo.userId }, select: { email: true } })
      if (owner?.email) {
        enviar2doPagoConfirmado(owner.email, {
          tiendaNombre: storeInfo.name || "Tu tienda",
          plan: updated.plan,
          nuevaExpiracion: formatDate(updated.endDate),
        }).catch(e => console.error("[subscription email] 2nd payment confirmed error:", e))
      }
    }
  }

  return NextResponse.json(updated)
}
