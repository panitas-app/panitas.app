import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { enviarRecordatorio2doPago } from "@/lib/email"
import { formatDate } from "@/lib/email-helpers"
import { timingSafeEqual } from "crypto"

function safeTokenMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, "utf8")
  const b = Buffer.from(expected, "utf8")
  if (a.length !== b.length) {
    timingSafeEqual(b, b)
    return false
  }
  return timingSafeEqual(a, b)
}

export async function POST(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 })
    }

    const authHeader = request.headers.get("authorization")
    const provided = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : ""
    if (!provided || !safeTokenMatch(provided, cronSecret)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const now = new Date()
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    const pendingSecondPayments = await prisma.storeSubscription.findMany({
      where: {
        status: "active",
        paymentMode: "installment",
        secondPaymentPaid: false,
        secondPaymentDue: { lte: threeDaysFromNow, gte: now },
      },
      select: {
        id: true,
        plan: true,
        installmentAmount: true,
        secondPaymentDue: true,
        store: {
          select: {
            name: true,
            userId: true,
          },
        },
      },
      take: 50,
    })

    let sent = 0
    for (const sub of pendingSecondPayments) {
      if (!sub.store?.userId || !sub.secondPaymentDue) continue

      const owner = await prisma.user.findUnique({
        where: { id: sub.store.userId },
        select: { email: true },
      })
      if (!owner?.email) continue

      await enviarRecordatorio2doPago(owner.email, {
        tiendaNombre: sub.store.name || "Tu tienda",
        plan: sub.plan,
        monto: sub.installmentAmount || 0,
        fechaVencimiento: formatDate(sub.secondPaymentDue),
      }).catch(e => console.error(`[cron 2nd-payment] error sub ${sub.id}:`, e))

      sent++
    }

    return NextResponse.json({ success: true, sent, total: pendingSecondPayments.length })
  } catch (error) {
    console.error("Cron subscription-second-payment error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
