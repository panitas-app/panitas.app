import type { TourStep } from "./types"

export const reservationSteps: TourStep[] = [
    {
      selector: "[data-tour='dashboard-title']",
      title: "Panel de agenda",
      description: "Todas tus citas y reservas en un solo vistazo.",
      icon: "👋",
      position: "bottom",
    },
    {
      selector: "[data-tour='nav-servicios']",
      title: "Crea tu primer servicio",
      description: "Agrega los servicios que ofreces para que los clientes puedan reservar.",
      icon: "💇",
      position: "right",
      action: { type: "click", selector: "[data-tour='nav-servicios'] a", hint: "Haz clic en Servicios" },
    },
    {
      selector: "[data-tour='kpi-citas-hoy']",
      title: "Citas de hoy",
      description: "Aquí ves las citas programadas para el día actual.",
      icon: "📅",
      position: "bottom",
    },
    {
      selector: "[data-tour='nav-agenda']",
      title: "Tu agenda",
      description: "Gestiona tu calendario, horarios y disponibilidad.",
      icon: "🗓️",
      position: "right",
    },
    {
      selector: "[data-tour='nav-horarios']",
      title: "Horarios",
      description: "Define tus horas de atención y días laborales.",
      icon: "⏰",
      position: "right",
    },
    {
      selector: "[data-tour='topbar']",
      title: "Todo configurado",
      description: "Ya tienes lo necesario para empezar a recibir reservas.",
      icon: "🎉",
      position: "bottom",
    },
  ]
