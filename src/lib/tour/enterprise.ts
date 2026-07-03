import type { TourStep } from "./types"

export const enterpriseSteps: TourStep[] = [
    {
      selector: "[data-tour='dashboard-title']",
      title: "Panel ejecutivo",
      description: "Resumen completo con ventas, comisiones, inventario y reportes.",
      icon: "👋",
      position: "bottom",
    },
    {
      selector: "[data-tour='nav-productos']",
      title: "Productos y más",
      description: "Agrega productos con presentaciones, tallas y precios al por mayor.",
      icon: "📦",
      position: "right",
      action: { type: "click", selector: "[data-tour='nav-productos'] a", hint: "Haz clic en Productos" },
    },
    {
      selector: "[data-tour='kpi-ventas-hoy']",
      title: "Ventas y comisiones",
      description: "Controla las ventas de tu equipo y las comisiones generadas.",
      icon: "💰",
      position: "bottom",
    },
    {
      selector: "[data-tour='store-url']",
      title: "Comparte tu tienda",
      description: "Tu enlace público para clientes directos y mayoristas.",
      icon: "🔗",
      position: "bottom",
      action: { type: "copy", selector: "[data-tour='store-url']", hint: "Haz clic para copiar" },
    },
    {
      selector: "[data-tour='nav-vendedores']",
      title: "Vendedores",
      description: "Gestiona tu equipo de ventas y asigna comisiones.",
      icon: "👥",
      position: "right",
    },
    {
      selector: "[data-tour='nav-comisiones']",
      title: "Comisiones",
      description: "Revisa las comisiones generadas y pendientes de pago.",
      icon: "📊",
      position: "right",
    },
    {
      selector: "[data-tour='nav-pedidos']",
      title: "Pedidos B2B",
      description: "Administra pedidos al por mayor y ventas directas.",
      icon: "📋",
      position: "right",
    },
    {
      selector: "[data-tour='topbar']",
      title: "Tu imperio listo",
      description: "Tienes el control total. Explora las secciones a tu ritmo.",
      icon: "🎉",
      position: "bottom",
    },
  ]
