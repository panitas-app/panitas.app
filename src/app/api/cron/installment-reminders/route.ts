import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { templateInstallmentReminder } from "@/lib/email-templates"
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

    // Find installments due in 3 days that are still pending
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    const threeDaysEnd = new Date(threeDaysFromNow)
    threeDaysEnd.setHours(23, 59, 59, 999)
    threeDaysFromNow.setHours(0, 0, 0, 0)

    const installments = await prisma.installment.findMany({
      where: {
        status: "pending",
        dueDate: { gte: threeDaysFromNow, lte: threeDaysEnd },
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            customerEmail: true,
            customerName: true,
          },
        },
      },
    })

    let sent = 0
    for (const inst of installments) {
      if (inst.order.customerEmail) {
        await sendEmail(
          inst.order.customerEmail,
          "Recordatorio de pago — Cuota de crédito próxima a vencer",
          templateInstallmentReminder(
            inst.order.customerName,
            inst.amount,
            inst.dueDate.toLocaleDateString("es-ES"),
            inst.order.orderNumber
          ),
          "installment_reminder"
        )
        sent++
      }
    }

    return NextResponse.json({ success: true, sent, total: installments.length })
  } catch (error) {
    console.error("Cron installment reminder error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
