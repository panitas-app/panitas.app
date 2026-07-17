import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { enviarPostCompra } from "@/lib/email"
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
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)

    const deliveredOrders = await prisma.order.findMany({
      where: {
        status: "delivered",
        automationPostPurchaseSent: false,
        deliveredAt: { lte: fortyEightHoursAgo, not: null },
        customerEmail: { not: null },
      },
      select: {
        id: true,
        customerEmail: true,
        customerName: true,
        storeId: true,
        store: { select: { name: true, slug: true } },
        items: { select: { productName: true }, take: 1 },
      },
      take: 50,
    })

    let sent = 0
    for (const order of deliveredOrders) {
      if (!order.customerEmail) continue

      const productoNombre = order.items[0]?.productName || "tu producto"

      await enviarPostCompra(order.customerEmail, {
        clienteNombre: order.customerName || "Cliente",
        tiendaNombre: order.store?.name || "Tu tienda",
        idPedido: order.id,
        productoNombre,
      }).catch(e => console.error(`[cron post-purchase] error order ${order.id}:`, e))

      await prisma.order.update({
        where: { id: order.id },
        data: { automationPostPurchaseSent: true },
      })

      sent++
    }

    return NextResponse.json({ success: true, sent, total: deliveredOrders.length })
  } catch (error) {
    console.error("Cron post-purchase error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
