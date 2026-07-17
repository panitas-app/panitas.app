const baseUrl = () => process.env.NEXTAUTH_URL || "http://localhost:3000"

function planLabel(plan: string): string {
  if (plan === "basico" || plan === "agenda") return "Agenda"
  if (plan === "emprendedor" || plan === "comercio") return "Emprendedor"
  if (plan === "negocio") return "Negocio"
  if (plan === "empresarial" || plan === "mayorista") return "Mayorista"
  return plan
}

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
      <a class="btn" href="${baseUrl()}/onboarding">Comenzar ahora</a>
    </p>
    <p>Si tienes alguna duda, responde a este correo o escríbenos por WhatsApp.</p>
  `
}

// ─── WELCOME VERIFIED (post email verification) ─────────────────────

export function templateWelcomeVerified(nombre: string, linkDashboard: string) {
  return `
    <h2>¡Tu correo ha sido verificado!</h2>
    <p>Hola <strong>${nombre}</strong>,</p>
    <p>Tu dirección de correo electrónico ha sido verificada exitosamente.</p>
    <p>Ya puedes acceder a todas las funciones de Panitas sin restricciones.</p>
    <p style="text-align:center">
      <a class="btn" href="${linkDashboard}">Ir al dashboard</a>
    </p>
  `
}

// ─── PAYMENT PENDING (subscription) ─────────────────────────────────

export function templatePaymentPending(nombre: string, plan: string, monto: number, referencia: string) {
  return `
    <h2>Recibimos tu comprobante de pago</h2>
    <p>Hola <strong>${nombre}</strong>,</p>
    <p>Hemos recibido tu solicitud de suscripción al plan <strong>${planLabel(plan)}</strong>.</p>
    <p>Tu pago está siendo verificado por nuestro equipo. Te notificaremos cuando esté aprobado.</p>
    <p><strong>Referencia:</strong> ${referencia}</p>
    <p><strong>Monto:</strong> $${monto.toFixed(2)}</p>
    <p>Este proceso puede tomar hasta 24 horas hábiles.</p>
  `
}

// ─── PAYMENT VERIFIED (subscription) ────────────────────────────────

export function templatePaymentVerified(nombre: string, tienda: string, plan: string) {
  return `
    <h2>¡Pago verificado con éxito!</h2>
    <p>Hola <strong>${nombre}</strong>,</p>
    <p>El pago de tu suscripción al plan <strong>${planLabel(plan)}</strong> ha sido verificado exitosamente.</p>
    <p>Tu tienda <strong>${tienda}</strong> ya está activa con todas las funciones del plan ${planLabel(plan)}.</p>
    <p>Ya puedes empezar a vender y gestionar tu negocio.</p>
    <p style="text-align:center">
      <a class="btn" href="${baseUrl()}/dashboard">Ir al dashboard</a>
    </p>
  `
}

// ─── PAYMENT REJECTED (subscription) ────────────────────────────────

export function templatePaymentRejected(nombre: string, tienda: string, plan: string, motivo?: string) {
  return `
    <h2>Pago no pudo ser verificado</h2>
    <p>Hola <strong>${nombre}</strong>,</p>
    <p>El pago de tu suscripción al plan <strong>${planLabel(plan)}</strong> para <strong>${tienda}</strong> no pudo ser verificado.</p>
    ${motivo ? `<p><strong>Motivo:</strong> ${motivo}</p>` : ""}
    <p>Puedes intentar nuevamente subiendo un comprobante de pago válido desde la página de suscripción.</p>
    <p style="text-align:center">
      <a class="btn" href="${baseUrl()}/subscribe?plan=${plan}">Intentar de nuevo</a>
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
      <a class="btn" href="${baseUrl()}/dashboard/orders/${idPedido}">Ver pedido</a>
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

// ─── APPOINTMENT CONFIRMATION (to client) ───────────────────────────

export function templateAppointmentConfirmation(
  clienteNombre: string,
  tiendaNombre: string,
  fecha: string,
  hora: string,
  servicioNombre: string,
  duracion: number,
  tipo: string,
  direccion?: string,
  notas?: string
) {
  const tipoLabel = tipo === "online" ? "En línea" : tipo === "home_service" ? "A domicilio" : "Presencial"
  return `
    <h2>Confirmación de tu cita</h2>
    <p>Hola <strong>${clienteNombre}</strong>,</p>
    <p>Tu cita en <strong>${tiendaNombre}</strong> ha sido confirmada.</p>
    <table>
      <tr><th>Servicio</th><td>${servicioNombre}</td></tr>
      <tr><th>Fecha</th><td>${fecha}</td></tr>
      <tr><th>Hora</th><td>${hora}</td></tr>
      <tr><th>Duración</th><td>${duracion} min</td></tr>
      <tr><th>Tipo</th><td>${tipoLabel}</td></tr>
      ${direccion ? `<tr><th>Dirección</th><td>${direccion}</td></tr>` : ""}
    </table>
    ${notas ? `<p><strong>Notas:</strong> ${notas}</p>` : ""}
    <p>Si necesitas cancelar o reprogramar, por favor avísanos con anticipación.</p>
  `
}

// ─── APPOINTMENT TO MERCHANT ────────────────────────────────────────

export function templateAppointmentToMerchant(
  tiendaNombre: string,
  clienteNombre: string,
  telefono: string,
  email: string | null,
  fecha: string,
  hora: string,
  servicio: string,
  duracion: number,
  tipo: string,
  notas?: string
) {
  const tipoLabel = tipo === "online" ? "En línea" : tipo === "home_service" ? "A domicilio" : "Presencial"
  return `
    <h2>Nueva cita agendada</h2>
    <p>Se ha agendado una nueva cita en <strong>${tiendaNombre}</strong>.</p>
    <table>
      <tr><th>Cliente</th><td>${clienteNombre}</td></tr>
      <tr><th>Teléfono</th><td>${telefono}</td></tr>
      ${email ? `<tr><th>Email</th><td>${email}</td></tr>` : ""}
      <tr><th>Servicio</th><td>${servicio}</td></tr>
      <tr><th>Fecha</th><td>${fecha}</td></tr>
      <tr><th>Hora</th><td>${hora}</td></tr>
      <tr><th>Duración</th><td>${duracion} min</td></tr>
      <tr><th>Tipo</th><td>${tipoLabel}</td></tr>
    </table>
    ${notas ? `<p><strong>Notas:</strong> ${notas}</p>` : ""}
    <p style="text-align:center">
      <a class="btn" href="${baseUrl()}/dashboard/agenda">Ver citas</a>
    </p>
  `
}

// ─── APPOINTMENT REMINDER ───────────────────────────────────────────

export function templateAppointmentReminder(
  clienteNombre: string,
  tiendaNombre: string,
  fecha: string,
  hora: string,
  servicioNombre: string,
  direccion?: string
) {
  return `
    <h2>Recordatorio: tu cita es mañana</h2>
    <p>Hola <strong>${clienteNombre}</strong>,</p>
    <p>Te recordamos que tienes una cita mañana en <strong>${tiendaNombre}</strong>.</p>
    <table>
      <tr><th>Servicio</th><td>${servicioNombre}</td></tr>
      <tr><th>Fecha</th><td>${fecha}</td></tr>
      <tr><th>Hora</th><td>${hora}</td></tr>
      ${direccion ? `<tr><th>Dirección</th><td>${direccion}</td></tr>` : ""}
    </table>
    <p>Si no puedes asistir, por favor cancela con anticipación.</p>
  `
}

// ─── APPOINTMENT COMPLETED ──────────────────────────────────────────

export function templateAppointmentCompleted(
  clienteNombre: string,
  tiendaNombre: string,
  fecha: string,
  hora: string,
  servicioNombre: string
) {
  return `
    <h2>¡Tu cita ha sido completada!</h2>
    <p>Hola <strong>${clienteNombre}</strong>,</p>
    <p>Tu cita en <strong>${tiendaNombre}</strong> ha sido completada exitosamente.</p>
    <table>
      <tr><th>Servicio</th><td>${servicioNombre}</td></tr>
      <tr><th>Fecha</th><td>${fecha}</td></tr>
      <tr><th>Hora</th><td>${hora}</td></tr>
    </table>
    <p>Esperamos que haya sido de tu agrado. ¡Te esperamos de nuevo!</p>
    <p style="text-align:center">
      <a class="btn" href="${baseUrl()}/dashboard/agenda/nueva">Agendar nueva cita</a>
    </p>
  `
}

// ─── TEAM INVITATION ────────────────────────────────────────────────

export function templateTeamInvitation(
  tiendaNombre: string,
  invitadoPor: string,
  rol: string,
  linkInvitacion: string
) {
  const rolLabel = rol === "admin" ? "Administrador" : rol === "manager" ? "Encargado" : rol === "seller" ? "Vendedor" : rol === "viewer" ? "Visor" : rol
  return `
    <h2>Has sido invitado a un equipo</h2>
    <p><strong>${invitadoPor}</strong> te ha invitado a formar parte del equipo de <strong>${tiendaNombre}</strong> en Panitas.</p>
    <p><strong>Rol asignado:</strong> ${rolLabel}</p>
    <p style="text-align:center">
      <a class="btn" href="${linkInvitacion}">Aceptar invitación</a>
    </p>
    <p style="color:#6b7280;font-size:12px">Esta invitación expira en 7 días. Si no solicitaste esto, ignora este mensaje.</p>
  `
}

// ─── TEAM INVITATION ACCEPTED ───────────────────────────────────────

export function templateTeamInvitationAccepted(
  tiendaNombre: string,
  nombreMiembro: string,
  emailMiembro: string,
  rol: string
) {
  const rolLabel = rol === "admin" ? "Administrador" : rol === "manager" ? "Encargado" : rol === "seller" ? "Vendedor" : rol === "viewer" ? "Visor" : rol
  return `
    <h2>Nuevo miembro en tu equipo</h2>
    <p><strong>${nombreMiembro}</strong> (${emailMiembro}) ha aceptado la invitación a <strong>${tiendaNombre}</strong>.</p>
    <p><strong>Rol:</strong> ${rolLabel}</p>
    <p style="text-align:center">
      <a class="btn" href="${baseUrl()}/dashboard/settings">Ver miembros del equipo</a>
    </p>
  `
}

// ─── TEAM ROLE CHANGED ──────────────────────────────────────────────

export function templateTeamRoleChanged(
  tiendaNombre: string,
  rolAnterior: string,
  rolNuevo: string,
  cambiadoPor: string
) {
  const label = (r: string) => r === "admin" ? "Administrador" : r === "manager" ? "Encargado" : r === "seller" ? "Vendedor" : r === "viewer" ? "Visor" : r
  return `
    <h2>Tu rol ha sido actualizado</h2>
    <p>Tu rol en <strong>${tiendaNombre}</strong> ha sido cambiado por <strong>${cambiadoPor}</strong>.</p>
    <p><strong>Rol anterior:</strong> ${label(rolAnterior)}</p>
    <p><strong>Rol nuevo:</strong> ${label(rolNuevo)}</p>
    <p style="text-align:center">
      <a class="btn" href="${baseUrl()}/dashboard">Ir al dashboard</a>
    </p>
  `
}

// ─── SUBSCRIPTION EXPIRED ───────────────────────────────────────────

export function templateSubscriptionExpired(
  tiendaNombre: string,
  plan: string,
  fechaExpiracion: string,
  modulosPerdidos: string
) {
  return `
    <h2>Tu plan ha expirado</h2>
    <p>Hola,</p>
    <p>Tu suscripción al plan <strong>${planLabel(plan)}</strong> para <strong>${tiendaNombre}</strong> ha expirado el ${fechaExpiracion}.</p>
    <p><strong>Módulos afectados:</strong> ${modulosPerdidos}</p>
    <p>Para reactivar tu tienda y recuperar el acceso a todas las funciones, realiza un nuevo pago.</p>
    <p style="text-align:center">
      <a class="btn" href="${baseUrl()}/subscribe?plan=${plan}">Renovar plan ahora</a>
    </p>
  `
}

// ─── SUBSCRIPTION SECOND PAYMENT REMINDER ────────────────────────────

export function templateSubscriptionSecondPaymentReminder(
  tiendaNombre: string,
  plan: string,
  monto: number,
  fechaVencimiento: string
) {
  return `
    <h2>Recordatorio: segundo pago pendiente</h2>
    <p>Hola,</p>
    <p>Tienes un segundo pago pendiente para tu suscripción al plan <strong>${planLabel(plan)}</strong> de <strong>${tiendaNombre}</strong>.</p>
    <p><strong>Monto:</strong> $${monto.toFixed(2)}</p>
    <p><strong>Fecha límite:</strong> ${fechaVencimiento}</p>
    <p>Realiza el pago antes de la fecha límite para mantener tu plan activo.</p>
    <p style="text-align:center">
      <a class="btn" href="${baseUrl()}/subscribe?plan=${plan}">Realizar pago</a>
    </p>
  `
}

// ─── SUBSCRIPTION SECOND PAYMENT CONFIRMED ───────────────────────────

export function templateSubscriptionSecondPaymentConfirmed(
  tiendaNombre: string,
  plan: string,
  nuevaExpiracion: string
) {
  return `
    <h2>Segundo pago confirmado</h2>
    <p>Hola,</p>
    <p>Tu segundo pago para el plan <strong>${planLabel(plan)}</strong> de <strong>${tiendaNombre}</strong> ha sido confirmado.</p>
    <p><strong>Nueva fecha de expiración:</strong> ${nuevaExpiracion}</p>
    <p>Tu plan permanece activo con todas las funciones.</p>
    <p style="text-align:center">
      <a class="btn" href="${baseUrl()}/dashboard/settings">Ver mi suscripción</a>
    </p>
  `
}

// ─── SUBSCRIPTION RENEWAL SUCCESS ────────────────────────────────────

export function templateSubscriptionRenewalSuccess(
  tiendaNombre: string,
  plan: string,
  periodo: string,
  nuevaExpiracion: string,
  monto: number
) {
  const periodoLabel = periodo === "yearly" ? "anual" : "mensual"
  return `
    <h2>¡Tu plan ha sido renovado!</h2>
    <p>Hola,</p>
    <p>La renovación de tu plan <strong>${planLabel(plan)}</strong> para <strong>${tiendaNombre}</strong> ha sido procesada exitosamente.</p>
    <table>
      <tr><th>Plan</th><td>${planLabel(plan)}</td></tr>
      <tr><th>Período</th><td>${periodoLabel}</td></tr>
      <tr><th>Monto</th><td>$${monto.toFixed(2)}</td></tr>
      <tr><th>Nueva expiración</th><td>${nuevaExpiracion}</td></tr>
    </table>
    <p style="text-align:center">
      <a class="btn" href="${baseUrl()}/dashboard">Ir al dashboard</a>
    </p>
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
      <a class="btn" href="${baseUrl()}/dashboard/products">Gestionar inventario</a>
    </p>
  `
}

// ─── POST PURCHASE FOLLOW-UP ────────────────────────────────────────

export function templatePostPurchaseFollowUp(
  clienteNombre: string,
  tiendaNombre: string,
  idPedido: string,
  productoNombre: string
) {
  return `
    <h2>¿Cómo te fue con tu compra?</h2>
    <p>Hola <strong>${clienteNombre}</strong>,</p>
    <p>Esperamos que estés disfrutando tu compra de <strong>${productoNombre}</strong> en <strong>${tiendaNombre}</strong>.</p>
    <p>Tu pedido #${idPedido} fue entregado hace unos días. Nos encantaría saber tu experiencia.</p>
    <p style="text-align:center">
      <a class="btn" href="${baseUrl()}/store/${tiendaNombre.toLowerCase().replace(/\s+/g, "-")}">Dejar una reseña</a>
    </p>
  `
}

// ─── INACTIVE CLIENT REACTIVATION ───────────────────────────────────

export function templateInactiveClientReactivation(
  clienteNombre: string,
  tiendaNombre: string,
  ultimaCompra: string
) {
  return `
    <h2>¡Te extrañamos!</h2>
    <p>Hola <strong>${clienteNombre}</strong>,</p>
    <p>Hace tiempo que no nos visitas en <strong>${tiendaNombre}</strong>. Tu última compra fue el ${ultimaCompra}.</p>
    <p>¿Qué tal si echas un vistazo a nuestras novedades y ofertas actuales?</p>
    <p style="text-align:center">
      <a class="btn" href="${baseUrl()}/store/${tiendaNombre.toLowerCase().replace(/\s+/g, "-")}">Ver nuevas ofertas</a>
    </p>
  `
}
