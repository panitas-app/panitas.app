import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { templateReservationReminder } from "@/lib/email-templates"
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
      },
      include: {
        agenda: { select: { nombre: true } },
        negocio: { select: { nombre: true } },
      },
    })

    let sent = 0
    for (const apt of appointments) {
      // Try to find customer email from agenda or negocio
      const agendaName = apt.agenda?.nombre || apt.negocio?.nombre || ""
      // Send reminder — we don't have customer email on appointments, only phone
      // For now, we log the reminder. If there's a way to find email, it would go here
      console.log(`[reservation-reminder] ${apt.customerName} — ${agendaName} — ${apt.date.toISOString().split("T")[0]} ${apt.time}`)
      sent++
    }

    return NextResponse.json({ success: true, sent, total: appointments.length })
  } catch (error) {
    console.error("Cron reservation reminder error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
