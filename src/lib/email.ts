import { Resend } from "resend"
import { prisma } from "@/lib/prisma"
import {
  templateWelcome,
  templateWelcomeVerified,
  templateNewOrderToMerchant,
  templateVerifyEmail,
  templatePaymentPending,
  templatePaymentVerified,
  templatePaymentRejected,
  templateOrderConfirmation,
  templateOrderShipped,
  templateAppointmentConfirmation,
  templateAppointmentToMerchant,
  templateAppointmentReminder,
  templateAppointmentCompleted,
  templateTeamInvitation,
  templateTeamInvitationAccepted,
  templateTeamRoleChanged,
  templateSubscriptionExpired,
  templateSubscriptionSecondPaymentReminder,
  templateSubscriptionSecondPaymentConfirmed,
  templateSubscriptionRenewalSuccess,
  templateInstallmentReminder,
  templateLowStock,
  templatePostPurchaseFollowUp,
  templateInactiveClientReactivation,
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
  .header img{height:40px;width:auto;pointer-events:none;-webkit-user-drag:none;user-select:none;-webkit-touch-callout:none}
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
  <div class="header"><img src="${baseUrl}/logonuevo.png" alt="Panitas" draggable="false" oncontextmenu="return false" /></div>
  <div class="body">${body}</div>
  <div class="footer">Panitas App &mdash; Hecho en Venezuela con &#10084;</div>
</div></body></html>`
}

// ─── HIGH-LEVEL WRAPPERS ──────────────────────────────────────────

export async function enviarBienvenida(email: string, nombre: string) {
  return sendEmail(email, "¡Bienvenido a Panitas!", templateWelcome(nombre), "welcome")
}

export async function enviarEmailVerificado(email: string, nombre: string, linkDashboard: string) {
  return sendEmail(email, "¡Tu correo ha sido verificado!", templateWelcomeVerified(nombre, linkDashboard), "welcome_verified")
}

export async function enviarAlertaNuevoPedido(emailComerciante: string, nombreTienda: string, idPedido: string, total: number) {
  return sendEmail(
    emailComerciante,
    `Nuevo pedido — ${nombreTienda}`,
    templateNewOrderToMerchant(nombreTienda, idPedido, total, "", "Cliente"),
    "new_order_merchant"
  )
}

export async function enviarConfirmacionCita(email: string, params: {
  clienteNombre: string; tiendaNombre: string; fecha: string; hora: string;
  servicioNombre: string; duracion: number; tipo: string; direccion?: string; notas?: string;
}) {
  return sendEmail(email, `Confirmación de cita — ${params.tiendaNombre}`,
    templateAppointmentConfirmation(params.clienteNombre, params.tiendaNombre, params.fecha, params.hora,
      params.servicioNombre, params.duracion, params.tipo, params.direccion, params.notas),
    "appointment_confirmation")
}

export async function enviarNuevaCitaNegocio(email: string, params: {
  tiendaNombre: string; clienteNombre: string; telefono: string; email: string | null;
  fecha: string; hora: string; servicio: string; duracion: number; tipo: string; notas?: string;
}) {
  return sendEmail(email, `Nueva cita agendada — ${params.tiendaNombre}`,
    templateAppointmentToMerchant(params.tiendaNombre, params.clienteNombre, params.telefono,
      params.email, params.fecha, params.hora, params.servicio, params.duracion, params.tipo, params.notas),
    "appointment_new")
}

export async function enviarRecordatorioCita(email: string, params: {
  clienteNombre: string; tiendaNombre: string; fecha: string; hora: string;
  servicioNombre: string; direccion?: string;
}) {
  return sendEmail(email, `Recordatorio: tu cita es mañana — ${params.tiendaNombre}`,
    templateAppointmentReminder(params.clienteNombre, params.tiendaNombre, params.fecha, params.hora,
      params.servicioNombre, params.direccion),
    "appointment_reminder")
}

export async function enviarCitaCompletada(email: string, params: {
  clienteNombre: string; tiendaNombre: string; fecha: string; hora: string; servicioNombre: string;
}) {
  return sendEmail(email, `¡Tu cita ha sido completada! — ${params.tiendaNombre}`,
    templateAppointmentCompleted(params.clienteNombre, params.tiendaNombre, params.fecha, params.hora,
      params.servicioNombre),
    "appointment_completed")
}

export async function enviarInvitacionEquipo(email: string, params: {
  tiendaNombre: string; invitadoPor: string; rol: string; linkInvitacion: string;
}) {
  return sendEmail(email, `Invitación a equipo — ${params.tiendaNombre}`,
    templateTeamInvitation(params.tiendaNombre, params.invitadoPor, params.rol, params.linkInvitacion),
    "team_invitation")
}

export async function enviarMiembroAceptado(email: string, params: {
  tiendaNombre: string; nombreMiembro: string; emailMiembro: string; rol: string;
}) {
  return sendEmail(email, `Nuevo miembro en tu equipo — ${params.tiendaNombre}`,
    templateTeamInvitationAccepted(params.tiendaNombre, params.nombreMiembro, params.emailMiembro, params.rol),
    "team_accepted")
}

export async function enviarCambioRol(email: string, params: {
  tiendaNombre: string; rolAnterior: string; rolNuevo: string; cambiadoPor: string;
}) {
  return sendEmail(email, `Tu rol ha sido actualizado — ${params.tiendaNombre}`,
    templateTeamRoleChanged(params.tiendaNombre, params.rolAnterior, params.rolNuevo, params.cambiadoPor),
    "team_role_changed")
}

export async function enviarPlanExpirado(email: string, params: {
  tiendaNombre: string; plan: string; fechaExpiracion: string; modulosPerdidos: string;
}) {
  return sendEmail(email, `Tu plan ha expirado — ${params.tiendaNombre}`,
    templateSubscriptionExpired(params.tiendaNombre, params.plan, params.fechaExpiracion, params.modulosPerdidos),
    "subscription_expired")
}

export async function enviarRecordatorio2doPago(email: string, params: {
  tiendaNombre: string; plan: string; monto: number; fechaVencimiento: string;
}) {
  return sendEmail(email, `Recordatorio: segundo pago pendiente — ${params.tiendaNombre}`,
    templateSubscriptionSecondPaymentReminder(params.tiendaNombre, params.plan, params.monto, params.fechaVencimiento),
    "subscription_second_payment_reminder")
}

export async function enviar2doPagoConfirmado(email: string, params: {
  tiendaNombre: string; plan: string; nuevaExpiracion: string;
}) {
  return sendEmail(email, `Segundo pago confirmado — ${params.tiendaNombre}`,
    templateSubscriptionSecondPaymentConfirmed(params.tiendaNombre, params.plan, params.nuevaExpiracion),
    "subscription_second_payment_confirmed")
}

export async function enviarRenovacionExitosa(email: string, params: {
  tiendaNombre: string; plan: string; periodo: string; nuevaExpiracion: string; monto: number;
}) {
  return sendEmail(email, `¡Tu plan ha sido renovado! — ${params.tiendaNombre}`,
    templateSubscriptionRenewalSuccess(params.tiendaNombre, params.plan, params.periodo, params.nuevaExpiracion, params.monto),
    "subscription_renewal")
}

export async function enviarPostCompra(email: string, params: {
  clienteNombre: string; tiendaNombre: string; idPedido: string; productoNombre: string;
}) {
  return sendEmail(email, `¿Cómo te fue con tu compra? — ${params.tiendaNombre}`,
    templatePostPurchaseFollowUp(params.clienteNombre, params.tiendaNombre, params.idPedido, params.productoNombre),
    "post_purchase")
}

export async function enviarClienteInactivo(email: string, params: {
  clienteNombre: string; tiendaNombre: string; ultimaCompra: string;
}) {
  return sendEmail(email, `¡Te extrañamos! — ${params.tiendaNombre}`,
    templateInactiveClientReactivation(params.clienteNombre, params.tiendaNombre, params.ultimaCompra),
    "inactive_client")
}

// ─── CORE SEND ─────────────────────────────────────────────────────

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
