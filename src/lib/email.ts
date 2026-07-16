import { Resend } from "resend"
import { prisma } from "@/lib/prisma"
import {
  templateWelcome,
  templateNewOrderToMerchant,
  templateVerifyEmail,
  templatePaymentPending,
  templatePaymentVerified,
  templatePaymentRejected,
  templateOrderConfirmation,
  templateOrderShipped,
  templateNewReservation,
  templateReservationReminder,
  templateInstallmentReminder,
  templateLowStock,
} from "@/lib/email-templates"

const resend = new Resend(process.env.RESEND_API_KEY || "")
const FROM = "Panitas <noreply@panitas.app>"

function htmlLayout(subject: string, body: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:0;background:#f4f4f5}
  .container{max-width:600px;margin:24px auto;background:#fff;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)}
  .header{background:#184BBF;padding:24px;text-align:center}
  .header img{height:40px;width:auto}
  .body{padding:24px;color:#102A43;font-size:14px;line-height:1.6}
  .body h2{color:#184BBF;font-size:18px;margin:0 0 16px}
  .footer{background:#f4f4f5;padding:16px;text-align:center;font-size:12px;color:#6b7280}
  .btn{display:inline-block;background:#184BBF;color:#fff!important;text-decoration:none;padding:12px 28px;font-weight:600;font-size:15px;margin:16px 0}
  .code{font-size:32px;font-weight:700;letter-spacing:8px;color:#184BBF;text-align:center;padding:16px;background:#f0f4ff;margin:16px 0;border-radius:8px}
  table{width:100%;border-collapse:collapse;margin:12px 0}
  td,th{padding:8px 12px;text-align:left;border-bottom:1px solid #e5e7eb;font-size:13px}
  th{background:#f9fafb;font-weight:600;color:#6b7280}
  .badge{display:inline-block;padding:2px 10px;border-radius:99px;font-size:12px;font-weight:600}
  .badge-green{background:#dcfce7;color:#166534}
  .badge-yellow{background:#fef3c7;color:#92400e}
  .badge-red{background:#fee2e2;color:#991b1b}
</style></head><body>
<div class="container">
  <div class="header"><img src="${baseUrl}/logo.png" alt="Panitas" /></div>
  <div class="body">${body}</div>
  <div class="footer">Panitas App &mdash; Hecho en Venezuela con ❤️</div>
</div></body></html>`
}

// ─── HIGH-LEVEL WRAPPERS ──────────────────────────────────────────

export async function enviarBienvenida(email: string, nombre: string) {
  return sendEmail(email, "¡Bienvenido a Panitas!", templateWelcome(nombre), "welcome")
}

export async function enviarAlertaNuevoPedido(emailComerciante: string, nombreTienda: string, idPedido: string, total: number) {
  return sendEmail(
    emailComerciante,
    `Nuevo pedido — ${nombreTienda}`,
    templateNewOrderToMerchant(nombreTienda, idPedido, total, "", "Cliente"),
    "new_order_merchant"
  )
}

export async function sendEmail(to: string, subject: string, htmlBody: string, template?: string) {
  const log = await prisma.emailLog.create({
    data: { to, subject, template: template || "general", status: "sending" },
  })

  if (!process.env.RESEND_API_KEY) {
    console.log(`[email mock] To: ${to} | Subject: ${subject}`)
    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status: "sent", attempts: 1, sentAt: new Date() },
    })
    return
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await resend.emails.send({
        from: FROM,
        to,
        subject,
        html: htmlLayout(subject, htmlBody),
      })
      await prisma.emailLog.update({
        where: { id: log.id },
        data: { status: "sent", attempts: attempt, sentAt: new Date() },
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
