import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { enviarClienteInactivo } from "@/lib/email"
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
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const inactiveCustomers = await prisma.customer.findMany({
      where: {
        isActive: true,
        email: { not: null },
        lastPurchaseAt: { lte: ninetyDaysAgo },
        OR: [
          { lastAutomationContactedAt: null },
          { lastAutomationContactedAt: { lte: sevenDaysAgo } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        lastPurchaseAt: true,
        storeId: true,
        store: { select: { name: true, slug: true } },
      },
      take: 50,
    })

    let sent = 0
    for (const customer of inactiveCustomers) {
      if (!customer.email) continue

      const ultimaCompra = customer.lastPurchaseAt ? formatDate(customer.lastPurchaseAt) : "desconocida"

      await enviarClienteInactivo(customer.email, {
        clienteNombre: customer.name || "Cliente",
        tiendaNombre: customer.store?.name || "Tu tienda",
        ultimaCompra,
      }).catch(e => console.error(`[cron inactive-clients] error customer ${customer.id}:`, e))

      await prisma.customer.update({
        where: { id: customer.id },
        data: { lastAutomationContactedAt: now },
      })

      sent++
    }

    return NextResponse.json({ success: true, sent, total: inactiveCustomers.length })
  } catch (error) {
    console.error("Cron inactive-clients error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
