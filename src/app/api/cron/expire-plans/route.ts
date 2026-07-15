import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
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

    const expired = await prisma.negocio.findMany({
      where: {
        planEstado: "activo",
        planVencimiento: { lte: now },
      },
      select: { id: true, nombre: true, store: { select: { email: true } } },
    })

    let deactivated = 0
    for (const neg of expired) {
      await prisma.negocio.update({
        where: { id: neg.id },
        data: { planEstado: "suspendido" },
      })

      const storeEmail = neg.store?.email
      if (storeEmail) {
        sendEmail(
          storeEmail,
          "Tu plan ha expirado — Panitas",
          `<p>Hola ${neg.nombre},</p><p>Tu plan ha expirado. Para reactivarlo, realiza un nuevo pago desde tu panel de suscripción.</p><p>Equipo Panitas</p>`,
          "plan_expired"
        ).catch(() => {})
      }

      deactivated++
    }

    return NextResponse.json({ success: true, deactivated, total: expired.length })
  } catch (error) {
    console.error("Cron expire-plans error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
