import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { enviarRecordatorioCita } from "@/lib/email"
import { formatDate, formatTime } from "@/lib/email-helpers"
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

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split("T")[0]

    const appointments = await prisma.appointment.findMany({
      where: {
        date: new Date(tomorrowStr),
        status: { in: ["pending", "confirmed"] },
        customerEmail: { not: null },
      },
      include: {
        service: { select: { name: true } },
        agenda: { select: { nombre: true } },
        negocio: { select: { nombre: true } },
      },
    })

    let sent = 0
    for (const apt of appointments) {
      if (!apt.customerEmail) continue

      const tiendaNombre = apt.negocio?.nombre || apt.agenda?.nombre || "Tu negocio"
      const servicioNombre = apt.service?.name || "Sin servicio"
      const fecha = formatDate(apt.date)
      const hora = formatTime(apt.time)

      await enviarRecordatorioCita(apt.customerEmail, {
        clienteNombre: apt.customerName,
        tiendaNombre,
        fecha,
        hora,
        servicioNombre,
        direccion: apt.address || undefined,
      }).catch(e => console.error(`[cron reservation-reminder] error apt ${apt.id}:`, e))

      sent++
    }

    return NextResponse.json({ success: true, sent, total: appointments.length })
  } catch (error) {
    console.error("Cron reservation reminder error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
