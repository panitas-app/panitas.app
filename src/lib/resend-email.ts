import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY || "")
const FROM = "Panitas <onboarding@resend.dev>"

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
  .btn{display:inline-block;background:#184BBF;color:#fff!important;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;margin:16px 0}
  .highlight{background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0;text-align:center}
  .highlight p{margin:4px 0}
  .highlight .amount{font-size:24px;font-weight:700;color:#184BBF}
</style></head><body>
<div class="container">
  <div class="header"><h1>${title}</h1></div>
  <div class="body">${body}</div>
  <div class="footer">Panitas App &mdash; Hecho en Venezuela con ❤️</div>
</div></body></html>`
}

export async function enviarBienvenida(email: string, nombre: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[resend mock] Bienvenida a ${email}`)
    return
  }

  const html = htmlLayout("¡Bienvenido a Panitas!", `
    <h2>¡Hola, ${nombre}!</h2>
    <p>Gracias por registrarte en Panitas. Estamos felices de tenerte a bordo.</p>
    <p>Con Panitas puedes crear tu tienda online, gestionar pedidos, agendar citas y mucho más.</p>
    <p style="text-align:center">
      <a class="btn" href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/onboarding">Comenzar ahora</a>
    </p>
    <p>Si tienes alguna duda, responde a este correo o escríbenos por WhatsApp.</p>
  `)

  try {
    await resend.emails.send({ from: FROM, to: email, subject: "¡Bienvenido a Panitas!", html })
  } catch (err) {
    console.error("[resend error] enviarBienvenida:", err)
  }
}

export async function enviarAlertaNuevoPedido(
  emailComerciante: string,
  nombreTienda: string,
  idPedido: string,
  total: number
) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[resend mock] Nuevo pedido a ${emailComerciante}: #${idPedido} - $${total}`)
    return
  }

  const html = htmlLayout("Nuevo pedido recibido", `
    <h2>¡Nuevo pedido en ${nombreTienda}! 🎉</h2>
    <div class="highlight">
      <p style="font-size:14px;color:#6b7280">N° Pedido</p>
      <p style="font-size:20px;font-weight:700;color:#102A43">#${idPedido}</p>
      <p style="font-size:14px;color:#6b7280;margin-top:12px">Monto total</p>
      <p class="amount">$${total.toFixed(2)}</p>
    </div>
    <p>Revisa los detalles del pedido en el panel de administración de tu tienda para gestionarlo.</p>
    <p style="text-align:center">
      <a class="btn" href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/orders/${idPedido}">Ver pedido</a>
    </p>
  `)

  try {
    await resend.emails.send({ from: FROM, to: emailComerciante, subject: `Nuevo pedido — ${nombreTienda}`, html })
  } catch (err) {
    console.error("[resend error] enviarAlertaNuevoPedido:", err)
  }
}
