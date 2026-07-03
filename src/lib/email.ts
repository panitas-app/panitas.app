import nodemailer from "nodemailer"
import { prisma } from "@/lib/prisma"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
})

const FROM = process.env.SMTP_FROM || "noreply@panitas.app"

function htmlLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:0;background:#f4f4f5}
  .container{max-width:600px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)}
  .header{background:#184BBF;padding:24px;text-align:center}
  .header h1{color:#FFB92E;margin:0;font-size:20px}
  .body{padding:24px;color:#102A43;font-size:14px;line-height:1.6}
  .body h2{color:#184BBF;font-size:18px;margin:0 0 16px}
  .footer{background:#f4f4f5;padding:16px;text-align:center;font-size:12px;color:#6b7280}
  .btn{display:inline-block;background:#184BBF;color:#fff!important;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:600;font-size:14px;margin:16px 0}
  table{width:100%;border-collapse:collapse;margin:12px 0}
  td,th{padding:8px 12px;text-align:left;border-bottom:1px solid #e5e7eb;font-size:13px}
  th{background:#f9fafb;font-weight:600;color:#6b7280}
  .badge{display:inline-block;padding:2px 10px;border-radius:99px;font-size:12px;font-weight:600}
  .badge-green{background:#dcfce7;color:#166534}
  .badge-yellow{background:#fef3c7;color:#92400e}
  .badge-red{background:#fee2e2;color:#991b1b}
</style></head><body>
<div class="container">
  <div class="header"><h1>${title}</h1></div>
  <div class="body">${body}</div>
  <div class="footer">Panitas App &mdash; Hecho en Venezuela con ❤️</div>
</div></body></html>`
}

export async function sendEmail(to: string, subject: string, htmlBody: string, template?: string) {
  const log = await prisma.emailLog.create({
    data: { to, subject, template: template || "general", status: "sending" },
  })

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[email mock] To: ${to} | Subject: ${subject}`)
    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status: "sent", attempts: 1 },
    })
    return
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await transporter.sendMail({ from: FROM, to, subject, html: htmlLayout(subject, htmlBody) })
      await prisma.emailLog.update({
        where: { id: log.id },
        data: { status: "sent", attempts: attempt },
      })
      return
    } catch (err: any) {
      if (attempt === 3) {
        await prisma.emailLog.update({
          where: { id: log.id },
          data: { status: "failed", attempts: attempt, error: err.message },
        })
        console.error(`[email error] To: ${to} | Subject: ${subject} | ${err.message}`)
      }
    }
  }
}

export function orderConfirmationHtml(order: {
  orderNumber: string
  customerName: string
  customerPhone: string
  total: number
  currency: string
  items: Array<{ name: string; qty: number; price: number }>
  storeName: string
  storeUrl: string
}) {
  const itemsHtml = order.items.map(i =>
    `<tr><td>${i.name}</td><td>${i.qty}</td><td>${order.currency === "USD" ? "$" : "Bs."}${i.price.toFixed(2)}</td></tr>`
  ).join("")
  return `\
<h2>Nuevo pedido recibido 🎉</h2>
<p><strong>Tienda:</strong> ${order.storeName}</p>
<p><strong>Cliente:</strong> ${order.customerName} — ${order.customerPhone}</p>
<p><strong>N° Pedido:</strong> ${order.orderNumber}</p>
<table><tr><th>Producto</th><th>Cant.</th><th>Precio</th></tr>${itemsHtml}</table>
<p style="font-size:18px;font-weight:700;text-align:right;color:#184BBF">Total: ${order.currency === "USD" ? "$" : "Bs."}${order.total.toFixed(2)}</p>
<a class="btn" href="${order.storeUrl}">Ver pedido en el dashboard</a>`
}

export function paymentVerifiedHtml(order: {
  orderNumber: string
  customerName: string
  total: number
  currency: string
  storeName: string
}) {
  return `\
<h2>Pago verificado ✅</h2>
<p>Hola <strong>${order.customerName}</strong>,</p>
<p>El pago de tu pedido <strong>#${order.orderNumber}</strong> en <strong>${order.storeName}</strong> ha sido verificado exitosamente.</p>
<p style="font-size:18px;font-weight:700;text-align:center;color:#184BBF">Monto: ${order.currency === "USD" ? "$" : "Bs."}${order.total.toFixed(2)}</p>
<p>Gracias por tu compra. Recibirás notificaciones sobre el estado de tu pedido.</p>`
}

export function subscriptionStatusHtml(sub: {
  storeName: string
  plan: string
  status: string
  period?: string
  startDate?: string
  endDate?: string
}) {
  const statusBadge = sub.status === "active" || sub.status === "verified" ? "✅ Verificada" : sub.status === "rejected" ? "❌ Rechazada" : sub.status === "cancelled" ? "❌ Cancelada" : "⏳ Pendiente"
  const planLabel = sub.plan === "basico" ? "Emprendedor" : sub.plan === "negocio" ? "Negocio" : sub.plan === "empresarial" ? "Empresarial" : sub.plan
  return `\
<h2>Actualización de suscripción</h2>
<p><strong>Tienda:</strong> ${sub.storeName}</p>
<p><strong>Plan:</strong> ${planLabel} ${statusBadge}</p>
${sub.period ? `<p><strong>Período:</strong> ${sub.period === "yearly" ? "Anual" : "Mensual"}</p>` : ""}
${sub.startDate ? `<p><strong>Inicio:</strong> ${new Date(sub.startDate).toLocaleDateString()}</p>` : ""}
${sub.endDate ? `<p><strong>Vence:</strong> ${new Date(sub.endDate).toLocaleDateString()}</p>` : ""}
<p>Puedes ver los detalles en el panel de administración de tu tienda.</p>`
}
