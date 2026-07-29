import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/permissions"
import { sendEmail, enviarLinkDescargaDigital } from "@/lib/email"
import { templateOrderPaymentVerified } from "@/lib/email-templates"
import { csrfGuard } from "@/lib/csrf"
import { createAuditEntry } from "@/lib/audit"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  try {
    const current = await requireRole(["admin", "manager"])
    const { id } = await params
    const body = await request.json()
    const { paymentId, orderStatus } = body

    const order = await prisma.order.findUnique({
      where: { id },
      include: { payments: true },
    })

    if (!order || order.storeId !== current.store.id) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const payment = order.payments.find((p) => p.id === paymentId)
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    await prisma.orderPayment.update({
      where: { id: paymentId },
      data: { status: "verified", paidAt: new Date() },
    })

    // NOTE: update + include triggers interactive transactions in Neon HTTP — do them separately
    await prisma.order.update({
      where: { id },
      data: {
        paymentStatus: "paid",
        status: orderStatus || "confirmed",
      },
    })

    const updated = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: { digitalProduct: true },
            },
          },
        },
        payments: { include: { paymentAccount: true } },
        store: true,
      },
    })

    if (!updated) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    await createAuditEntry({ action: "payment.verified", entity: "OrderPayment", entityId: paymentId, storeId: current.store.id, userId: current.userId })

    // ─── Digital delivery: generate tokens and send download email ───
    const digitalItems = updated.items.filter(
      (item) => item.product?.productType === "digital" && item.product?.digitalProduct
    )

    if (digitalItems.length > 0) {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
      const itemsHtmlParts: string[] = []

      for (const item of digitalItems) {
        const dp = item.product!.digitalProduct!
        const expirationDays = dp.expirationDays || 0
        const expiresAt = expirationDays > 0
          ? new Date(Date.now() + expirationDays * 86400000)
          : null
        const maxDownloads = dp.downloadLimit || 0

        // Generate one token per quantity (or one per item type)
        for (let i = 0; i < item.quantity; i++) {
          const token = crypto.randomUUID()
          await prisma.digitalDelivery.create({
            data: {
              token,
              orderItemId: item.id,
              expiresAt,
              maxDownloads,
            },
          })
        }

        // Collect all tokens for this item type for the email
        const deliveries = await prisma.digitalDelivery.findMany({
          where: { orderItemId: item.id },
        })

        const downloadLinks = deliveries.map(
          (d) => `<li><a href="${baseUrl}/api/download/${d.token}" style="color:#184BBF;font-weight:600">Descargar ${item.product!.name}${deliveries.length > 1 ? ` (copia ${d.downloadCount + 1})` : ""}</a></li>`
        ).join("")

        itemsHtmlParts.push(`
          <div style="margin-bottom:16px;padding:12px;background:#f9fafb;border-radius:8px">
            <p style="font-weight:600;margin:0 0 8px">${item.product!.name}</p>
            <ul style="margin:0;padding-left:20px;font-size:13px">${downloadLinks}</ul>
            ${expirationDays > 0 ? `<p style="font-size:11px;color:#6b7280;margin:8px 0 0">Expira: ${expiresAt!.toLocaleDateString("es-VE")}</p>` : ""}
            ${maxDownloads > 0 ? `<p style="font-size:11px;color:#6b7280;margin:2px 0 0">Máx. descargas: ${maxDownloads}</p>` : ""}
          </div>
        `)
      }

      if (updated.customerEmail) {
        const purchaseMessage = digitalItems[0]?.product?.digitalProduct?.purchaseMessage || undefined
        enviarLinkDescargaDigital(updated.customerEmail, {
          clienteNombre: updated.customerName,
          storeName: updated.store.name,
          itemsHtml: itemsHtmlParts.join(""),
          purchaseMessage,
        }).catch(e => console.error("[digital download email error]", e))
      }
    }

    // ─── Payment verified email ───
    if (updated.customerEmail) {
      sendEmail(
        updated.customerEmail,
        "Pago verificado — Panitas",
        templateOrderPaymentVerified(updated.customerName, updated.orderNumber, updated.store.name),
        "payment_verified"
      ).catch(e => console.error("Email error:", e))
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    if (error?.message?.includes("No tienes")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Verify payment error:", error)
    return NextResponse.json(
      { error: error?.message || "Error al verificar el pago" },
      { status: 500 }
    )
  }
}
