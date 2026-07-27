import { SEOPages } from "@/lib/seo/constants"

export interface SeoLandingData {
  heroTitle: string
  heroSubtitle: string
  features: { title: string; desc: string }[]
  faqs: { q: string; a: string }[]
  ctaText: string
}

export const SEO_LANDING_DATA: Record<string, SeoLandingData> = {
  "/software-administrativo": {
    heroTitle: "Software Administrativo para tu Negocio en Venezuela",
    heroSubtitle: "Centraliza la gestión de tu empresa con un sistema administrativo completo: inventario, ventas, facturación, clientes y reportes. Todo desde la nube, sin instalaciones.",
    features: [
      { title: "Control de inventario en tiempo real", desc: "Gestiona tu stock con alertas de productos bajos, códigos de barras, control de vencimientos y transferencias entre sucursales." },
      { title: "Facturación y punto de venta", desc: "Registra ventas rápidas, genera facturas electrónicas, aplica descuentos y gestiona múltiples métodos de pago: pago móvil, transferencias y efectivo." },
      { title: "Reportes y dashboard financiero", desc: "Dashboard de ventas, gastos, cuentas por cobrar y reportes personalizados para tomar decisiones con datos reales." },
      { title: "CRM integrado", desc: "Historial de compras por cliente, notas, seguimiento, etiquetas y gestión de cobros. Todo vinculado a las ventas." },
    ],
    faqs: [
      { q: "¿Qué incluye un software administrativo?", a: "Un software administrativo incluye control de inventario, facturación, gestión de clientes, reportes financieros y, en el caso de Panitas, también agenda de citas, tienda online y punto de venta POS." },
      { q: "¿Puedo probar el software administrativo gratis?", a: "Sí. Panitas ofrece 14 días de prueba gratuita sin necesidad de tarjeta de crédito. Puedes probar todas las funcionalidades antes de decidirte." },
      { q: "¿Funciona sin internet?", a: "Panitas funciona en la nube, por lo que necesitas conexión a internet. Puedes acceder desde cualquier dispositivo con navegador web." },
    ],
    ctaText: "Prueba el software administrativo gratis",
  },
  "/software-inventario": {
    heroTitle: "Sistema de Control de Inventario en Tiempo Real",
    heroSubtitle: "Controla tu stock con precisión. Alertas de productos bajos, códigos de barras, importación desde Excel y actualización automática con cada venta.",
    features: [
      { title: "Inventario en tiempo real", desc: "Cada venta ajusta tu stock automáticamente. Nunca más vendas un producto agotado." },
      { title: "Códigos de barras", desc: "Genera e imprime códigos de barras para tus productos. Acelera tus ventas y reduces errores." },
      { title: "Alertas de stock bajo", desc: "Configura umbrales mínimos y recibe notificaciones cuando un producto necesita reposición." },
      { title: "Importación desde Excel", desc: "Sube tu inventario desde hojas de cálculo. El sistema detecta nombre, precio, stock y categoría automáticamente." },
    ],
    faqs: [
      { q: "¿Cómo se actualiza el inventario?", a: "El inventario se actualiza automáticamente con cada venta registrada en el POS o en la tienda online. También puedes hacer ajustes manuales." },
      { q: "¿Puedo tener múltiples almacenes?", a: "Sí. Panitas soporta gestión multi-almacén. Puedes transferir productos entre sucursales y ver el stock consolidado." },
      { q: "¿Sirve para controlar vencimientos?", a: "Sí. Puedes registrar fechas de vencimiento por lote y recibir alertas de productos próximos a vencer." },
    ],
    ctaText: "Controla tu inventario gratis",
  },
  "/software-pos": {
    heroTitle: "Punto de Venta (POS) para tu Negocio en Venezuela",
    heroSubtitle: "Registra ventas rápido, cobra en dólares o bolívares, acepta pago móvil y transferencias. Un POS moderno integrado con tu inventario y contabilidad.",
    features: [
      { title: "POS rápido e intuitivo", desc: "Selecciona productos, calcula totales al instante y genera tickets en segundos. Funciona con pantalla táctil." },
      { title: "Múltiples métodos de pago", desc: "Acepta pago móvil, transferencias bancarias, efectivo en bolívares y dólares, y pagos internacionales." },
      { title: "Control de caja diaria", desc: "Abre y cierra caja, registra movimientos, arquea al final del día y genera reportes de cierre." },
      { title: "Descuentos y notas", desc: "Aplica descuentos por producto o por venta, agrega notas y personaliza los tickets de venta." },
    ],
    faqs: [
      { q: "¿Necesito hardware especial para el POS?", a: "No. Panitas POS funciona desde cualquier computador, tablet o celular con navegador web. Puedes usar una impresora de tickets térmica si lo deseas." },
      { q: "¿El POS actualiza el inventario?", a: "Sí. Cada venta realizada en el POS descuenta automáticamente los productos del inventario en tiempo real." },
      { q: "¿Puedo cobrar en dólares?", a: "Sí. Panitas POS acepta cobros en dólares y bolívares. Puedes configurar la tasa del BCV para conversiones automáticas." },
    ],
    ctaText: "Prueba el POS gratis",
  },
}

function getDefaultData(route: string): SeoLandingData {
  const label = route.replace("/", "").replace(/-/g, " ")
  const name = label.charAt(0).toUpperCase() + label.slice(1)
  return {
    heroTitle: `${name} | Software para tu Negocio`,
    heroSubtitle: `Descubre cómo Panitas puede ayudarte a gestionar tu negocio con herramientas diseñadas para ${label} en Venezuela.`,
    features: [
      { title: "Control de inventario", desc: "Gestiona tu stock en tiempo real con alertas, códigos de barras y control de vencimientos." },
      { title: "Punto de venta integrado", desc: "Registra ventas rápidas, acepta múltiples métodos de pago y genera tickets automáticos." },
      { title: "Agenda de citas online", desc: "Tus clientes reservan en línea, reciben recordatorios y tú gestionas tu calendario." },
      { title: "Reportes y dashboard", desc: "Visualiza ventas, gastos y rendimiento con gráficos en tiempo real." },
    ],
    faqs: [
      { q: `¿Panitas sirve para ${label}?`, a: `Sí. Panitas está diseñado para adaptarse a negocios de ${label}. Agenda, POS, inventario y CRM funcionan para cualquier tipo de comercio o servicio.` },
      { q: "¿Cuánto tiempo toma la configuración?", a: "La configuración inicial toma menos de 10 minutos. Solo necesitas registrar tu negocio, agregar tus productos y empezar a vender." },
      { q: "¿Tiene prueba gratuita?", a: "Sí. Todos los planes incluyen 14 días de prueba gratuita sin tarjeta de crédito." },
    ],
    ctaText: `Prueba Panitas para ${label} gratis`,
  }
}

export function getSeoLandingData(route: string): SeoLandingData {
  return SEO_LANDING_DATA[route] || getDefaultData(route)
}