export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://panitas.app"
export const SITE_NAME = "Panitas"
export const SITE_DESCRIPTION =
  "SaaS venezolano todo-en-uno para gestionar tu negocio: tienda online, agenda de citas, CRM y control B2B. Sin complicaciones técnicas."
export const DEFAULT_OG_IMAGE = "/og-image.png"
export const TWITTER_HANDLE = "@panitasapp"
export const LOCALE = "es_VE"
export const THEME_COLOR = "#FFB92E"
export const BACKGROUND_COLOR = "#102A43"

export const PUBLIC_ROUTES = [
  { path: "/", label: "Inicio", changefreq: "weekly", priority: 1 },
  { path: "/pricing", label: "Planes y Precios", changefreq: "monthly", priority: 0.9 },
  { path: "/choose-plan", label: "Elegir Plan", changefreq: "monthly", priority: 0.8 },
  { path: "/subscribe", label: "Suscribirse", changefreq: "monthly", priority: 0.7 },
  { path: "/contacto", label: "Contacto", changefreq: "yearly", priority: 0.6 },
  { path: "/faq", label: "Preguntas Frecuentes", changefreq: "monthly", priority: 0.7 },
  { path: "/terminos", label: "Términos y Condiciones", changefreq: "yearly", priority: 0.4 },
  { path: "/privacidad", label: "Política de Privacidad", changefreq: "yearly", priority: 0.4 },
  { path: "/register", label: "Registro", changefreq: "yearly", priority: 0.5 },
  { path: "/login", label: "Iniciar Sesión", changefreq: "yearly", priority: 0.4 },
  { path: "/join", label: "Unirse", changefreq: "yearly", priority: 0.3 },
] as const

export const PAGE_META: Record<string, { title: string; description: string; keywords?: string }> = {
  "/": {
    title: "Panitas – Gestiona tu negocio, vende online, organiza tus citas y escala",
    description: SITE_DESCRIPTION,
    keywords: "SaaS venezolano, tienda online Venezuela, agenda de citas, CRM, gestión de negocio, b2b venezuela",
  },
  "/pricing": {
    title: "Planes y Precios | Panitas — Agenda, Emprendedor, Mayorista",
    description: "Compara los planes de Panitas: Agenda ($15/mes), Emprendedor ($25/mes) y Mayorista ($45/mes). Todos con prueba gratuita.",
    keywords: "precios panitas, planes saas, agenda precio, emprendedor precio, mayorista precio",
  },
  "/choose-plan": {
    title: "Elige tu Plan | Panitas — Empieza hoy",
    description: "Selecciona el plan perfecto para tu negocio: Agenda para citas, Emprendedor para tienda+agenda+CRM, o Mayorista para B2B.",
  },
  "/subscribe": {
    title: "Suscribirse | Panitas — Activa tu plan",
    description: "Completa tu suscripción a Panitas. Sube tu comprobante de pago y empieza a gestionar tu negocio en minutos.",
  },
  "/contacto": {
    title: "Contacto | Panitas — Estamos para ayudarte",
    description: "¿Tienes dudas? Contáctanos por correo o a través de nuestro formulario. Te responderemos en menos de 24 horas.",
  },
  "/faq": {
    title: "Preguntas Frecuentes | Panitas — Centro de ayuda",
    description: "Respuestas a las preguntas más comunes sobre Panitas: planes, pagos, registro, facturación y soporte técnico.",
  },
  "/terminos": {
    title: "Términos y Condiciones | Panitas",
    description: "Términos y condiciones de uso de la plataforma Panitas. Al usar nuestro servicio aceptas estos términos.",
  },
  "/privacidad": {
    title: "Política de Privacidad | Panitas",
    description: "Política de privacidad de Panitas. Conoce cómo protegemos y gestionamos tus datos personales.",
  },
  "/register": {
    title: "Registro | Panitas — Crea tu cuenta gratis",
    description: "Regístrate en Panitas y empieza a gestionar tu negocio. Crea tu tienda online, agenda de citas y CRM en minutos.",
  },
  "/login": {
    title: "Iniciar Sesión | Panitas",
    description: "Accede a tu panel de control de Panitas. Gestiona tu tienda, agenda, clientes y ventas desde un solo lugar.",
  },
  "/join": {
    title: "Únete a una tienda | Panitas",
    description: "Únete como miembro a una tienda existente en Panitas y colabora con tu equipo.",
  },
}
