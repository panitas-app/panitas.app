// ─── EMAIL VERIFICATION ─────────────────────────────────────────────

export function templateVerifyEmail(nombre: string, codigo: string, link: string) {
  return `
    <h2>Verifica tu correo electrónico</h2>
    <p>Hola <strong>${nombre}</strong>,</p>
    <p>Para continuar con la configuración de tu cuenta en Panitas, verifica tu correo con este código:</p>
    <div class="code">${codigo}</div>
    <p>Este código expira en <strong>15 minutos</strong>.</p>
    <p>O haz clic en el siguiente enlace para verificar automáticamente:</p>
    <p style="text-align:center"><a class="btn" href="${link}">Verificar mi correo</a></p>
    <p style="color:#6b7280;font-size:12px">Si no solicitaste esto, ignora este mensaje.</p>
  `
}

// ─── WELCOME ────────────────────────────────────────────────────────

export function templateWelcome(nombre: string) {
  return `
    <h2>¡Bienvenido a Panitas!</h2>
    <p>Hola <strong>${nombre}</strong>,</p>
    <p>Gracias por registrarte en Panitas. Estamos felices de tenerte a bordo.</p>
    <p>Con Panitas puedes crear tu tienda online, gestionar pedidos, agendar citas y mucho más.</p>
    <p style="text-align:center">
      <a class="btn" href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/onboarding">Comenzar ahora</a>
    </p>
    <p>Si tienes alguna duda, responde a este correo o escríbenos por WhatsApp.</p>
  `
}

// ─── PAYMENT PENDING (subscription) ─────────────────────────────────

export function templatePaymentPending(nombre: string, plan: string, monto: number, referencia: string) {
  const planLabel = plan === "basico" || plan === "emprendedor" ? "Emprendedor" : plan === "negocio" ? "Negocio" : plan === "empresarial" ? "Empresarial" : plan
  return `
    <h2>Recibimos tu comprobante de pago</h2>
    <p>Hola <strong>${nombre}</strong>,</p>
    <p>Hemos recibido tu solicitud de suscripción al plan <strong>${planLabel}</strong>.</p>
    <p>Tu pago está siendo verificado por nuestro equipo. Te notificaremos cuando esté aprobado.</p>
    <p><strong>Referencia:</strong> ${referencia}</p>
    <p><strong>Monto:</strong> $${monto.toFixed(2)}</p>
    <p>Este proceso puede tomar hasta 24 horas hábiles.</p>
  `
}

// ─── PAYMENT VERIFIED (subscription) ────────────────────────────────

export function templatePaymentVerified(nombre: string, tienda: string, plan: string) {
  const planLabel = plan === "basico" || plan === "emprendedor" ? "Emprendedor" : plan === "negocio" ? "Negocio" : plan === "empresarial" ? "Empresarial" : plan
  return `
    <h2>¡Pago verificado con éxito!</h2>
    <p>Hola <strong>${nombre}</strong>,</p>
    <p>El pago de tu suscripción al plan <strong>${planLabel}</strong> ha sido verificado exitosamente.</p>
    <p>Tu tienda <strong>${tienda}</strong> ya está activa con todas las funciones del plan ${planLabel}.</p>
    <p>Ya puedes empezar a vender y gestionar tu negocio.</p>
    <p style="text-align:center">
      <a class="btn" href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard">Ir al dashboard</a>
    </p>
  `
}

// ─── PAYMENT REJECTED (subscription) ────────────────────────────────

export function templatePaymentRejected(nombre: string, tienda: string, plan: string, motivo?: string) {
  const planLabel = plan === "basico" || plan === "emprendedor" ? "Emprendedor" : plan === "negocio" ? "Negocio" : plan === "empresarial" ? "Empresarial" : plan
  return `
    <h2>Pago no pudo ser verificado</h2>
    <p>Hola <strong>${nombre}</strong>,</p>
    <p>El pago de tu suscripción al plan <strong>${planLabel}</strong> para <strong>${tienda}</strong> no pudo ser verificado.</p>
    ${motivo ? `<p><strong>Motivo:</strong> ${motivo}</p>` : ""}
    <p>Puedes intentar nuevamente subiendo un comprobante de pago válido desde la página de suscripción.</p>
    <p style="text-align:center">
      <a class="btn" href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/subscribe?plan=${plan}">Intentar de nuevo</a>
    </p>
  `
}

// ─── NEW ORDER TO MERCHANT ──────────────────────────────────────────

export function templateNewOrderToMerchant(
  nombreTienda: string,
  idPedido: string,
  total: number,
  items: string,
  cliente: string
) {
  return `
    <h2>¡Nuevo pedido recibido!</h2>
    <p>Se ha recibido un nuevo pedido en <strong>${nombreTienda}</strong>.</p>
    <p><strong>Cliente:</strong> ${cliente}</p>
    <p><strong>N° Pedido:</strong> #${idPedido}</p>
    <p><strong>Total:</strong> $${total.toFixed(2)}</p>
    <p>${items}</p>
    <p style="text-align:center">
      <a class="btn" href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/orders/${idPedido}">Ver pedido</a>
    </p>
  `
}

// ─── ORDER CONFIRMATION TO CUSTOMER ─────────────────────────────────

export function templateOrderConfirmation(
  cliente: string,
  idPedido: string,
  tienda: string,
  items: string,
  total: number
) {
  return `
    <h2>Confirmación de tu pedido</h2>
    <p>Hola <strong>${cliente}</strong>,</p>
    <p>Gracias por tu compra en <strong>${tienda}</strong>.</p>
    <p><strong>N° Pedido:</strong> #${idPedido}</p>
    <p>${items}</p>
    <p style="font-size:18px;font-weight:700;text-align:right;color:#184BBF">Total: $${total.toFixed(2)}</p>
    <p>Te notificaremos cuando tu pedido sea despachado.</p>
  `
}

// ─── ORDER SHIPPED ──────────────────────────────────────────────────

export function templateOrderShipped(cliente: string, idPedido: string, tienda: string) {
  return `
    <h2>¡Tu pedido ha sido despachado!</h2>
    <p>Hola <strong>${cliente}</strong>,</p>
    <p>Tu pedido <strong>#${idPedido}</strong> en <strong>${tienda}</strong> ha sido <strong>despachado</strong> y está en camino.</p>
    <p>Pronto recibirás actualizaciones sobre la entrega.</p>
    <p>Gracias por tu compra.</p>
  `
}

// ─── NEW RESERVATION ────────────────────────────────────────────────

export function templateNewReservation(cliente: string, tienda: string, fecha: string, hora: string, servicio: string) {
  return `
    <h2>Nueva reserva agendada</h2>
    <p>Se ha agendado una nueva reserva en <strong>${tienda}</strong>.</p>
    <p><strong>Cliente:</strong> ${cliente}</p>
    <p><strong>Servicio:</strong> ${servicio}</p>
    <p><strong>Fecha:</strong> ${fecha}</p>
    <p><strong>Hora:</strong> ${hora}</p>
    <p style="text-align:center">
      <a class="btn" href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard">Ver reservas</a>
    </p>
  `
}

// ─── RESERVATION REMINDER ───────────────────────────────────────────

export function templateReservationReminder(cliente: string, tienda: string, fecha: string, hora: string) {
  return `
    <h2>Recordatorio: tienes una cita mañana</h2>
    <p>Hola <strong>${cliente}</strong>,</p>
    <p>Te recordamos que tienes una reserva agendada en <strong>${tienda}</strong>.</p>
    <p><strong>Fecha:</strong> ${fecha}</p>
    <p><strong>Hora:</strong> ${hora}</p>
    <p>Si no puedes asistir, por favor cancela con anticipación.</p>
  `
}

// ─── INSTALLMENT REMINDER ───────────────────────────────────────────

export function templateInstallmentReminder(cliente: string, monto: number, fechaVencimiento: string, ordenId: string) {
  return `
    <h2>Recordatorio de pago — Cuota de crédito</h2>
    <p>Hola <strong>${cliente}</strong>,</p>
    <p>Te recordamos que tienes una cuota de crédito próxima a vencer.</p>
    <p><strong>N° Pedido:</strong> #${ordenId}</p>
    <p><strong>Monto:</strong> $${monto.toFixed(2)}</p>
    <p><strong>Fecha de vencimiento:</strong> ${fechaVencimiento}</p>
    <p>Realiza el pago a tiempo para evitar recargos.</p>
  `
}

// ─── LOW STOCK ──────────────────────────────────────────────────────

export function templateLowStock(tienda: string, productos: string) {
  return `
    <h2>Productos con stock bajo</h2>
    <p>Hola,</p>
    <p>Los siguientes productos en <strong>${tienda}</strong> tienen stock bajo o están agotados:</p>
    <p>${productos}</p>
    <p style="text-align:center">
      <a class="btn" href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/products">Gestionar inventario</a>
    </p>
  `
}
