import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { enviarPlanExpirado } from "@/lib/email"
import { getPlanModules } from "@/lib/plans"
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

    const expired = await prisma.negocio.findMany({
      where: {
        planEstado: "activo",
        planVencimiento: { lte: now },
      },
      select: {
        id: true,
        nombre: true,
        planId: true,
        planVencimiento: true,
        store: { select: { name: true, email: true, userId: true } },
      },
    })

    let deactivated = 0
    for (const neg of expired) {
      await prisma.negocio.update({
        where: { id: neg.id },
        data: { planEstado: "suspendido" },
      })

      // Send proper template email
      const ownerEmail = neg.store?.email
      if (ownerEmail && neg.store?.userId) {
        const modulos = getPlanModules(neg.planId).join(", ") || "módulos básicos"
        enviarPlanExpirado(ownerEmail, {
          tiendaNombre: neg.store.name || neg.nombre,
          plan: neg.planId,
          fechaExpiracion: neg.planVencimiento ? formatDate(neg.planVencimiento) : "desconocida",
          modulosPerdidos: modulos,
        }).catch(() => {})
      }

      deactivated++
    }

    return NextResponse.json({ success: true, deactivated, total: expired.length })
  } catch (error) {
    console.error("Cron expire-plans error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
