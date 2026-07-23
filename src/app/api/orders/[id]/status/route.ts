import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { sendEmail } from "@/lib/email"
import { templateOrderShipped } from "@/lib/email-templates"
import { createAuditEntry } from "@/lib/audit"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(req)
  if (csrf) return csrf
  try {
    const { store, userId } = await requireRole(["admin", "manager"])
    const { id } = await params
    const body = await req.json()
    const { status } = body

    const validStatuses = ["pending", "confirmed", "preparing", "shipped", "delivered", "cancelled"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 })
    }

    const existing = await prisma.order.findUnique({ where: { id }, select: { storeId: true, status: true } })
    if (!existing || existing.storeId !== store.id) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 })
    }

    // If cancelling, restore stock and update customer totals
    if (status === "cancelled") {
      const order = await prisma.order.findUnique({
        where: { id },
        select: { status: true, total: true, customerId: true, items: { select: { productId: true, quantity: true } } },
      })
      if (order && order.status !== "cancelled") {
        for (const item of order.items) {
          await prisma.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          })
        }
        if (order.customerId) {
          await prisma.customer.update({
            where: { id: order.customerId },
            data: {
              totalSpent: { decrement: order.total },
              totalOrders: { decrement: 1 },
            },
          })
        }
      }
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        items: { include: { product: { select: { name: true } } } },
        payments: {
          include: { paymentAccount: { select: { bankName: true, accountNumber: true, accountHolder: true } } },
        },
        store: { select: { name: true, whatsapp: true } },
      },
    })

    await createAuditEntry({ action: "order.status_changed", entity: "Order", entityId: id, metadata: { oldStatus: existing.status, newStatus: status }, storeId: store.id, userId })

    // Send "dispatched" email to customer when status changes to shipped
    if (status === "shipped" && updated.customerEmail) {
      sendEmail(
        updated.customerEmail,
        `¡Tu pedido #${updated.orderNumber} ha sido despachado! — ${updated.store?.name || "Tu tienda"}`,
        templateOrderShipped(updated.customerName, updated.orderNumber, updated.store?.name || "Tu tienda"),
        "order_shipped"
      ).catch(e => console.error("[shipped email error]", e))
    }

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error && error.message.includes("No tienes")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error instanceof Error && (error.message.includes("pendiente de pago") || error.message.includes("plan"))) {
      return NextResponse.json({ error: error.message }, { status: 402 })
    }
    console.error("Error updating order status:", error)
    return NextResponse.json({ error: "Error al actualizar el estado" }, { status: 500 })
  }
}
