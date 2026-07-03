import type { TourStep } from "./types"

export const businessSteps: TourStep[] = [
    {
      selector: "[data-tour='dashboard-title']",
      title: "Panel unificado",
      description: "Aquí ves tu tienda + agenda en un solo lugar. Ventas, citas y métricas.",
      icon: "👋",
      position: "bottom",
    },
    {
      selector: "[data-tour='nav-productos']",
      title: "Agrega tu primer producto",
      description: "Empieza agregando lo que vendes. Productos, servicios o ambos.",
      icon: "📦",
      position: "right",
      action: { type: "click", selector: "[data-tour='nav-productos'] a", hint: "Haz clic en Productos" },
    },
    {
      selector: "[data-tour='kpi-ventas-hoy']",
      title: "Ventas de hoy",
      description: "Tus ingresos del día se actualizan automáticamente con cada pedido.",
      icon: "💰",
      position: "bottom",
    },
    {
      selector: "[data-tour='store-url']",
      title: "Comparte tu tienda",
      description: "Copia este enlace y compártelo. Tus clientes verán tu catálogo y agenda.",
      icon: "🔗",
      position: "bottom",
      action: { type: "copy", selector: "[data-tour='store-url']", hint: "Haz clic para copiar" },
    },
    {
      selector: "[data-tour='nav-pedidos']",
      title: "Pedidos",
      description: "Administra las órdenes de tus clientes aquí.",
      icon: "📋",
      position: "right",
    },
    {
      selector: "[data-tour='nav-agenda']",
      title: "Agenda de citas",
      description: "Gestiona las reservas y el calendario de tu negocio.",
      icon: "📅",
      position: "right",
    },
    {
      selector: "[data-tour='nav-clientes']",
      title: "CRM de clientes",
      description: "Lleva el control de tus clientes, sus compras y seguimientos.",
      icon: "👥",
      position: "right",
    },
    {
      selector: "[data-tour='topbar']",
      title: "Explora con confianza",
      description: "Ya tienes lo básico. El resto lo descubrirás sobre la marcha.",
      icon: "🎉",
      position: "bottom",
    },
  ]
