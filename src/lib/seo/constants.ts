export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://panitas.app"
export const SITE_NAME = "Panitas"
export const SITE_DESCRIPTION =
  "Software administrativo en la nube para controlar inventario, vender online, agendar citas y administrar tu negocio desde un solo lugar. Diseñado para Venezuela."
export const SITE_TITLE_SUFFIX = " | Panitas"
export const DEFAULT_OG_IMAGE = "/og-image.jpg"
export const TWITTER_HANDLE = "@panitasapp"
export const LOCALE = "es_VE"
export const THEME_COLOR = "#FFB92E"
export const BACKGROUND_COLOR = "#102A43"

export const PUBLIC_ROUTES = [
  { path: "/", label: "Inicio", changefreq: "weekly", priority: 1 },
  { path: "/pricing", label: "Planes y Precios", changefreq: "monthly", priority: 0.9 },
  { path: "/contacto", label: "Contacto", changefreq: "yearly", priority: 0.6 },
  { path: "/faq", label: "Preguntas Frecuentes", changefreq: "monthly", priority: 0.7 },
  { path: "/terminos", label: "Términos y Condiciones", changefreq: "yearly", priority: 0.4 },
  { path: "/privacidad", label: "Política de Privacidad", changefreq: "yearly", priority: 0.4 },
] as const

/**
 * Páginas SEO de contenido. Activar en sitemap.ts cuando la página exista.
 */
export const SEOPages = [
  { route: "/software-administrativo", priority: 0.6, changefreq: "monthly" as const },
  { route: "/software-inventario", priority: 0.6, changefreq: "monthly" as const },
  { route: "/software-pos", priority: 0.6, changefreq: "monthly" as const },
  { route: "/software-para-negocios", priority: 0.6, changefreq: "monthly" as const },
  { route: "/software-para-barberias", priority: 0.6, changefreq: "monthly" as const },
  { route: "/software-para-peluquerias", priority: 0.6, changefreq: "monthly" as const },
  { route: "/software-para-salones-de-belleza", priority: 0.6, changefreq: "monthly" as const },
  { route: "/software-para-clinicas", priority: 0.6, changefreq: "monthly" as const },
  { route: "/software-para-medicos", priority: 0.6, changefreq: "monthly" as const },
  { route: "/software-para-odontologos", priority: 0.6, changefreq: "monthly" as const },
  { route: "/software-para-psicologos", priority: 0.6, changefreq: "monthly" as const },
  { route: "/software-para-esteticas", priority: 0.6, changefreq: "monthly" as const },
  { route: "/software-para-spa", priority: 0.6, changefreq: "monthly" as const },
  { route: "/software-para-restaurantes", priority: 0.6, changefreq: "monthly" as const },
  { route: "/software-para-ferreterias", priority: 0.6, changefreq: "monthly" as const },
  { route: "/software-para-tiendas", priority: 0.6, changefreq: "monthly" as const },
  { route: "/software-para-minimarket", priority: 0.6, changefreq: "monthly" as const },
  { route: "/agenda-online", priority: 0.6, changefreq: "monthly" as const },
  { route: "/agenda-de-citas", priority: 0.6, changefreq: "monthly" as const },
  { route: "/agenda-para-profesionales", priority: 0.6, changefreq: "monthly" as const },
  { route: "/tienda-online", priority: 0.6, changefreq: "monthly" as const },
  { route: "/plan-agenda", priority: 0.8, changefreq: "monthly" as const },
  { route: "/plan-emprendedor", priority: 0.8, changefreq: "monthly" as const },
  { route: "/plan-mayorista", priority: 0.8, changefreq: "monthly" as const },
] as const

export const PAGE_META: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Panitas | Software Administrativo para Negocios en Venezuela",
    description: "Software administrativo en la nube para controlar inventario, vender online con POS, agendar citas y administrar clientes. Diseñado para negocios venezolanos. Prueba gratis 14 días.",
  },
  "/pricing": {
    title: "Panitas | Planes y Precios del Software Administrativo SaaS",
    description: "Conoce los planes de Panitas: Agenda ($15/mes) para profesionales de citas, Emprendedor ($25/mes) con tienda online y POS, y Mayorista ($45/mes) para distribución B2B.",
  },
  "/choose-plan": {
    title: "Panitas | Elige tu Plan y Activa tu Prueba Gratis",
    description: "Selecciona el plan ideal para tu negocio: Agenda para citas online, Emprendedor para ventas e inventario, o Mayorista para operaciones B2B. Todos con 14 días gratis.",
  },
  "/subscribe": {
    title: "Panitas | Activa tu Suscripción y Empieza a Vender",
    description: "Completa tu suscripción a Panitas. Sube tu comprobante de pago y empieza a gestionar tu inventario, ventas y agenda en minutos. Pago móvil y transferencia.",
  },
  "/contacto": {
    title: "Panitas | Contáctanos — Soporte para tu Negocio",
    description: "¿Tienes dudas sobre Panitas? Contáctanos por correo o formulario. Te responderemos en menos de 24 horas. Software administrativo para negocios en Venezuela.",
  },
  "/faq": {
    title: "Panitas | Preguntas Frecuentes sobre el Software Administrativo",
    description: "Respuestas a las preguntas más comunes sobre Panitas: cómo funciona, planes, métodos de pago, seguridad, y soporte técnico. Software administrativo en la nube.",
  },
  "/terminos": {
    title: "Panitas | Términos y Condiciones de Uso",
    description: "Términos y condiciones del software administrativo Panitas. Al usar nuestro servicio aceptas estas condiciones. Plataforma SaaS para negocios en Venezuela.",
  },
  "/privacidad": {
    title: "Panitas | Política de Privacidad y Protección de Datos",
    description: "Política de privacidad de Panitas. Conoce cómo protegemos y gestionamos tus datos personales en nuestro software administrativo para negocios.",
  },
  "/register": {
    title: "Panitas | Crea tu Cuenta Gratis — Software Administrativo",
    description: "Regístrate en Panitas gratis y empieza a gestionar tu negocio. Crea tu tienda online, agenda de citas y controla tu inventario desde un solo lugar. Sin tarjeta de crédito.",
  },
  "/login": {
    title: "Panitas | Iniciar Sesión en tu Panel de Control",
    description: "Accede a tu panel de control de Panitas. Gestiona tu tienda, agenda de citas, inventario, clientes y ventas desde un solo lugar. Software administrativo en la nube.",
  },
  "/join": {
    title: "Panitas | Únete a una Tienda como Miembro del Equipo",
    description: "Únete como miembro a una tienda existente en Panitas. Accede al panel de control y colabora con tu equipo en la gestión del negocio.",
  },
  "/software-administrativo": {
    title: "Panitas | Software Administrativo para Negocios en la Nube",
    description: "Software administrativo en la nube para controlar inventario, facturar con POS, gestionar citas online y administrar clientes. Todo en un solo sistema para tu negocio.",
  },
  "/software-pos": {
    title: "Panitas | Punto de Venta (POS) para tu Negocio en Venezuela",
    description: "Punto de venta (POS) integrado con control de inventario y ventas. Registra ventas rápidas, acepta pago móvil y transferencias. Software POS para negocios venezolanos.",
  },
  "/software-inventario": {
    title: "Panitas | Sistema de Control de Inventario en Tiempo Real",
    description: "Software de control de inventario con alertas de stock bajo, códigos de barras, importación desde Excel y actualización automática con cada venta. Para negocios en Venezuela.",
  },
  "/software-para-negocios": {
    title: "Panitas | Software para Negocios y Emprendedores en Venezuela",
    description: "Software para negocios con inventario, facturación, POS, tienda online y CRM. Administra tu empresa desde cualquier lugar. Diseñado para emprendedores venezolanos.",
  },
  "/software-para-barberias": {
    title: "Panitas | Software para Barberías con Agenda de Citas Online",
    description: "Software para barberías con agenda de citas online, POS para cobros, control de servicios y recordatorios automáticos. Administra tu barbería desde el celular.",
  },
  "/software-para-peluquerias": {
    title: "Panitas | Software para Peluquerías y Salones de Belleza",
    description: "Software para peluquerías con agenda online, gestión de profesionales, POS y recordatorios automáticos. Ideal para salones de belleza en Venezuela.",
  },
  "/software-para-salones-de-belleza": {
    title: "Panitas | Software para Salones de Belleza y Centros de Estética",
    description: "Software para salones de belleza con agenda de citas, control de servicios, gestión de profesionales y punto de venta. Todo lo que necesitas para tu centro de estética.",
  },
  "/software-para-clinicas": {
    title: "Panitas | Software para Clínicas con Historia Clínica y Agenda",
    description: "Software para clínicas y consultorios con agenda de citas online, recordatorios automáticos y gestión de pacientes. Administra tu clínica desde cualquier lugar.",
  },
  "/software-para-medicos": {
    title: "Panitas | Software para Médicos con Agenda de Citas Online",
    description: "Software para médicos con agenda online, recordatorios automáticos a pacientes y perfil profesional público. Gestiona tus consultas desde el celular o computador.",
  },
  "/software-para-odontologos": {
    title: "Panitas | Software para Odontólogos con Agenda y Recordatorios",
    description: "Software para odontólogos con agenda de citas online, recordatorios automáticos y perfil profesional. Administra tu consultorio dental de forma eficiente.",
  },
  "/software-para-psicologos": {
    title: "Panitas | Software para Psicólogos con Agenda Online Segura",
    description: "Software para psicólogos con agenda de citas online, recordatorios a pacientes y perfil profesional. Gestiona tus consultas de manera organizada y profesional.",
  },
  "/software-para-esteticas": {
    title: "Panitas | Software para Centros de Estética con Agenda y POS",
    description: "Software para centros de estética con agenda de citas, punto de venta, control de servicios y paquetes. Administra tu estética con herramientas profesionales.",
  },
  "/software-para-spa": {
    title: "Panitas | Software para Spa con Reservas Online y POS",
    description: "Software para spa con agenda de reservas online, POS integrado, gestión de tratamientos y recordatorios automáticos. Ideal para centros de bienestar.",
  },
  "/software-para-restaurantes": {
    title: "Panitas | Software para Restaurantes con POS y Agenda de Mesas",
    description: "Software para restaurantes con punto de venta, agenda de mesas, control de insumos y reportes de ventas. Administra tu restaurante desde un solo sistema.",
  },
  "/software-para-ferreterias": {
    title: "Panitas | Software para Ferreterías con Control de Inventario",
    description: "Software para ferreterías con inventario completo, código de barras, precios mayoristas y minoristas, y punto de venta. Controla tu ferretería desde la nube.",
  },
  "/software-para-tiendas": {
    title: "Panitas | Software para Tiendas con POS y Tienda Online",
    description: "Software para tiendas con punto de venta integrado, tienda online, control de inventario y clientes. Todo lo que necesitas para administrar tu tienda.",
  },
  "/software-para-minimarket": {
    title: "Panitas | Software para Minimarket con POS y Control de Stock",
    description: "Software para minimarket con punto de venta rápido, control de inventario, alertas de stock bajo y reportes de ventas. Ideal para bodegones y abastos.",
  },
  "/agenda-online": {
    title: "Panitas | Agenda Online para Profesionales con Reservas Web",
    description: "Agenda online para profesionales con reservas web, recordatorios automáticos, calendario compartido y gestión de múltiples sedes. Prueba gratis 14 días.",
  },
  "/agenda-de-citas": {
    title: "Panitas | Sistema de Agenda de Citas con Reservas Automáticas",
    description: "Sistema de agenda de citas online con disponibilidad en tiempo real, recordatorios automáticos y gestión de profesionales. Ideal para barberías, clínicas y salones.",
  },
  "/agenda-para-profesionales": {
    title: "Panitas | Agenda para Profesionales con Reservas Online",
    description: "Agenda para profesionales independientes con reservas online, calendario personalizado y recordatorios automáticos. Gestiona tus citas desde cualquier dispositivo.",
  },
  "/tienda-online": {
    title: "Panitas | Crea tu Tienda Online con POS y Control de Inventario",
    description: "Crea tu tienda online profesional con catálogo de productos, carrito de compras, POS integrado y control de inventario. Vende en Venezuela sin comisiones.",
  },
  "/blog": {
    title: "Panitas | Blog de Software Administrativo para Negocios",
    description: "Artículos sobre software administrativo, control de inventario, punto de venta, agenda de citas, marketing digital y consejos para hacer crecer tu negocio en Venezuela.",
  },
  "/blog/inventario": {
    title: "Inventario | Blog de Panitas",
    description: "Artículos sobre control de inventario, stock, códigos de barras y gestión de productos para negocios en Venezuela.",
  },
  "/blog/ventas-pos": {
    title: "Ventas y POS | Blog de Panitas",
    description: "Artículos sobre punto de venta, facturación, métodos de pago y ventas para negocios en Venezuela.",
  },
  "/blog/agenda-citas": {
    title: "Agenda de Citas | Blog de Panitas",
    description: "Artículos sobre agenda de citas, reservas online, recordatorios y calendario para profesionales.",
  },
  "/blog/negocios": {
    title: "Negocios | Blog de Panitas",
    description: "Artículos sobre emprendimiento, administración y crecimiento empresarial para negocios en Venezuela.",
  },
  "/blog/tienda-online": {
    title: "Tienda Online | Blog de Panitas",
    description: "Artículos sobre e-commerce, catálogo digital y ventas por internet para negocios en Venezuela.",
  },
  "/blog/tutoriales": {
    title: "Tutoriales | Blog de Panitas",
    description: "Guías paso a paso para usar Panitas y sacar el máximo provecho de tu software administrativo.",
  },
  "/plan-agenda": {
    title: "Panitas | Software de Agenda Online para Venezuela — $15/mes",
    description: "Software de agenda online para barberías, clínicas, consultorios y spas en Venezuela. Reservas 24/7, recordatorios automáticos y gestión de profesionales. Desde $15/mes.",
  },
  "/plan-emprendedor": {
    title: "Panitas | Software Todo en Uno para Emprendedores — $25/mes",
    description: "Software administrativo para tiendas y comercios en Venezuela. Tienda online, POS, inventario, CRM y agenda integrados. Sin instalar nada. Desde $25/mes.",
  },
  "/plan-mayorista": {
    title: "Panitas | Sistema B2B para Mayoristas y Distribuidoras — $45/mes",
    description: "Sistema B2B para distribuidoras y mayoristas en Venezuela. Comisiones de vendedores, notas de entrega, precios por volumen e inventario ilimitado. Desde $45/mes.",
  },
}