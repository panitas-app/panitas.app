import type { TourStep } from "./types"

export const entrepreneurSteps: TourStep[] = [
    {
      selector: "[data-tour='dashboard-title']",
      title: "Bienvenido a tu panel",
      description: "Aquí ves un resumen de tu negocio. Ventas, pedidos y visitas en tiempo real.",
      icon: "👋",
      position: "bottom",
    },
    {
      selector: "[data-tour='nav-productos']",
      title: "Tu primer producto",
      description: "Haz clic aquí para agregar tu primer producto. Sin productos, no hay ventas.",
      icon: "📦",
      position: "right",
      action: {
        type: "click",
        selector: "[data-tour='nav-productos'] a",
        hint: "Haz clic en 'Productos' en el menú",
      },
      beforeEnter: async () => {
        // Check if user already has products - skip if yes
      },
    },
    {
      selector: "[data-tour='kpi-ventas-hoy']",
      title: "Ventas del día",
      description: "Cuando recibas tu primer pedido, aquí verás las ventas en tiempo real.",
      icon: "💰",
      position: "bottom",
    },
    {
      selector: "[data-tour='store-url']",
      title: "Comparte tu tienda",
      description: "Este es el enlace de tu tienda. Cópialo y compártelo con tus clientes.",
      icon: "🔗",
      position: "bottom",
      action: {
        type: "copy",
        selector: "[data-tour='store-url']",
        hint: "Haz clic para copiar el enlace",
      },
    },
    {
      selector: "[data-tour='nav-pedidos']",
      title: "Gestiona tus pedidos",
      description: "Aquí ves y administras todos los pedidos que recibes.",
      icon: "📋",
      position: "right",
    },
    {
      selector: "[data-tour='nav-analiticas']",
      title: "Estadísticas",
      description: "Revisa cómo le está yendo a tu negocio con gráficos y métricas.",
      icon: "📊",
      position: "right",
    },
    {
      selector: "[data-tour='topbar']",
      title: "¡Todo listo!",
      description: "Ya conoces lo esencial. Explora el resto cuando quieras.",
      icon: "🎉",
      position: "bottom",
    },
  ]
