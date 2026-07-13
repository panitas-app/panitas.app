import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { csrfGuard } from "@/lib/csrf"

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
  const { reference, bankOrigin, paidAt, receiptImage } = body

  // Extend endDate by 15 days if subscription is active
  if (subscription.status === "active" && subscription.endDate) {
    const extendedEnd = new Date(subscription.endDate)
    extendedEnd.setDate(extendedEnd.getDate() + 15)
    await prisma.storeSubscription.update({
      where: { id },
      data: {
        secondPaymentPaid: true,
        secondPaymentPaidAt: paidAt ? new Date(paidAt) : new Date(),
        secondPaymentReference: reference || null,
        secondPaymentBankOrigin: bankOrigin || null,
        secondPaymentReceipt: receiptImage || null,
        endDate: extendedEnd,
      },
    })
  } else {
    await prisma.storeSubscription.update({
      where: { id },
      data: {
        secondPaymentPaid: true,
        secondPaymentPaidAt: paidAt ? new Date(paidAt) : new Date(),
        secondPaymentReference: reference || null,
        secondPaymentBankOrigin: bankOrigin || null,
        secondPaymentReceipt: receiptImage || null,
      },
    })
  }

  const updated = await prisma.storeSubscription.findUnique({ where: { id } })
  return NextResponse.json(updated)
}
