import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { sendEmail } from "@/lib/email"
import { templateOrderShipped } from "@/lib/email-templates"
import { OrderService } from "@/services/order.service"
import { toServiceResponse } from "@/services/http"
import type { StoreServiceContext } from "@/services/context"

const orderService = new OrderService()

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(req)
  if (csrf) return csrf

  try {
    const { store, userId } = await requireRole(["admin", "manager"])
    const { id } = await params
    const body = await req.json()
    const { status } = body

    const ctx: StoreServiceContext = {
      storeId: store.id,
      userId,
      plan: store.plan,
      storeName: store.name,
      storeEmail: store.email,
    }

    // La cancelación atómica (stock, totales de cliente, crédito/cuotas, audit y
    // eventos) vive en OrderService.updateStatus — una sola implementación para
    // la UI y las herramientas del agente.
    const updated = await orderService.updateStatus(ctx, id, status)

    if (!updated) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 })
    }

    if (status === "shipped" && updated.customerEmail) {
      sendEmail(
        updated.customerEmail,
        `¡Tu pedido #${updated.orderNumber} ha sido despachado! — ${store.name || "Tu tienda"}`,
        templateOrderShipped(updated.customerName, updated.orderNumber, store.name || "Tu tienda"),
        "order_shipped"
      ).catch(e => console.error("[shipped email error]", e))
    }

    // Respuesta con el mismo shape del detalle (GET /api/orders/[id]).
    const [payments, storeInfo, digitalDeliveries] = await Promise.all([
      prisma.orderPayment.findMany({
        where: { orderId: id },
        include: { paymentAccount: true },
      }),
      prisma.store.findUnique({
        where: { id: store.id },
        select: { name: true, whatsapp: true, email: true, phone: true },
      }),
      prisma.digitalDelivery.findMany({
        where: { orderItem: { orderId: id } },
        include: { orderItem: { select: { id: true, productName: true } } },
      }),
    ])

    return NextResponse.json({ ...updated, payments, store: storeInfo, digitalDeliveries })
  } catch (error) {
    if (error instanceof Error && error.message.includes("No tienes")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return toServiceResponse(error)
  }
}
