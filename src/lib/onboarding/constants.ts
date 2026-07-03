import type { QuizQuestion, PlanInfo, QuizAnswers } from "./types"

export const QUESTIONS: QuizQuestion[] = [
  {
    id: "professionalType",
    title: "¿Eres profesional independiente o tienes un negocio?",
    subtitle: "Esto nos ayuda a recomendarte las herramientas adecuadas",
    options: [
      { value: "independiente", label: "Independiente", description: "Trabajo por cuenta propia", icon: "User" },
      { value: "negocio", label: "Tengo un negocio", description: "Local comercial o tienda física", icon: "Store" },
      { value: "ambos", label: "Ambos", description: "Soy independiente y tengo negocio", icon: "Handshake" },
      { value: "mayorista", label: "Mayorista / Distribuidora", description: "Vendo al por mayor", icon: "Package" },
    ],
  },
  {
    id: "profession",
    title: "¿Cuál es tu profesión?",
    subtitle: "Selecciona la que más se ajuste a ti",
    options: [
      { value: "barberia", label: "Barbería", icon: "Scissors" },
      { value: "estetica", label: "Estética", icon: "Sparkles" },
      { value: "salud", label: "Salud / Bienestar", icon: "Heart" },
      { value: "masajes", label: "Masajes / Spa", icon: "Hand" },
      { value: "entrenamiento", label: "Entrenamiento / Fitness", icon: "Dumbbell" },
      { value: "fotografia", label: "Fotografía", icon: "Camera" },
      { value: "consultoria", label: "Consultoría", icon: "ClipboardList" },
      { value: "tutorias", label: "Tutorías / Clases", icon: "BookOpen" },
      { value: "musica", label: "Música / Audio", icon: "Music" },
      { value: "arte", label: "Arte / Diseño", icon: "Palette" },
    ],
    condition: (a) => a.professionalType === "independiente" || a.professionalType === "ambos",
  },
  {
    id: "storeType",
    title: "¿Qué tipo de negocio tienes?",
    subtitle: "Selecciona el que más se parezca al tuyo",
    options: [
      { value: "barberia", label: "Barbería / Salón", icon: "Scissors" },
      { value: "restaurante", label: "Restaurante", icon: "UtensilsCrossed" },
      { value: "tienda_online", label: "Tienda Online", icon: "ShoppingBag" },
      { value: "distribuidora", label: "Distribuidora", icon: "Truck" },
      { value: "ropa", label: "Ropa / Moda", icon: "Shirt" },
      { value: "calzado", label: "Calzado", icon: "Footprints" },
      { value: "joyeria", label: "Joyería / Accesorios", icon: "Gem" },
      { value: "electronicos", label: "Electrónicos", icon: "Smartphone" },
      { value: "hogar", label: "Hogar / Decoración", icon: "Home" },
      { value: "juguetes", label: "Juguetes / Regalos", icon: "Gamepad2" },
      { value: "deportes", label: "Deportes", icon: "Trophy" },
      { value: "libros", label: "Librería / Papelería", icon: "BookOpen" },
      { value: "heladeria", label: "Heladería / Postres", icon: "IceCream" },
      { value: "panaderia", label: "Panadería / Pastelería", icon: "Croissant" },
      { value: "licores", label: "Licores / Vinos", icon: "Wine" },
      { value: "farmacia", label: "Farmacia / Perfumería", icon: "Pill" },
      { value: "mascotas", label: "Mascotas / Veterinaria", icon: "PawPrint" },
      { value: "floreria", label: "Florería", icon: "Flower2" },
      { value: "ferreteria", label: "Ferretería / Construcción", icon: "Wrench" },
      { value: "auto", label: "Autopartes / Taller", icon: "Car" },
    ],
    condition: (a) => a.professionalType === "negocio" || a.professionalType === "ambos" || a.professionalType === "mayorista",
  },
  {
    id: "goal",
    title: "¿Cuál es tu objetivo principal?",
    subtitle: "Esto define cómo configuramos tu negocio",
    options: [
      { value: "publico", label: "Vender al público general", description: "Productos o servicios para clientes directos", icon: "Users" },
      { value: "mayorista", label: "Venta al por mayor (B2B)", description: "Distribución a otros negocios", icon: "Package" },
      { value: "ambos", label: "Ambos", description: "Venta directa y al por mayor", icon: "Handshake" },
    ],
    condition: (a) => a.professionalType === "negocio" || a.professionalType === "ambos" || a.professionalType === "mayorista",
  },
]

export function getActiveQuestions(answers: QuizAnswers): QuizQuestion[] {
  return QUESTIONS.filter((q) => !q.condition || q.condition(answers))
}

export function getRecommendedPlan(answers: QuizAnswers): string {
  const type = answers.professionalType

  if (type === "mayorista") return "empresarial"
  if (type === "negocio") return "emprendedor"
  if (type === "independiente") return "reservas"
  if (type === "ambos") return "negocio"
  return "emprendedor"
}

export const PLANS: PlanInfo[] = [
  {
    id: "emprendedor",
    name: "Emprendedor",
    price: 15,
    description: "Perfecto para profesionales independientes que venden productos",
    features: [
      "Tienda online profesional",
      "Catálogo de productos ilimitado",
      "Gestión de pedidos",
      "Enlace público para compartir",
      "Estadísticas básicas",
    ],
  },
  {
    id: "reservas",
    name: "Reservas",
    price: 15,
    description: "Ideal para quienes trabajan por citas y reservaciones",
    features: [
      "Agenda de citas inteligente",
      "Calendario de disponibilidad",
      "Recordatorios automáticos",
      "Gestión de servicios",
      "Horarios personalizados",
    ],
  },
  {
    id: "negocio",
    name: "Negocio",
    price: 25,
    description: "La combinación perfecta de tienda + agenda",
    features: [
      "Todo lo de Emprendedor",
      "Todo lo de Reservas",
      "Dashboard unificado",
      "CRM de clientes",
      "Analíticas avanzadas",
      "Múltiples miembros del equipo",
    ],
    badge: "Más popular",
  },
  {
    id: "empresarial",
    name: "Empresarial",
    price: 35,
    description: "Para negocios en crecimiento con equipo de ventas",
    features: [
      "Todo lo de Negocio",
      "POS (Punto de Venta)",
      "Gestión de vendedores",
      "Comisiones automáticas",
      "Inventario avanzado",
      "Ventas al por mayor (B2B)",
      "Reportes financieros",
      "Soporte prioritario",
    ],
    badge: "Profesional",
  },
]

export function getPlanById(id: string): PlanInfo | undefined {
  return PLANS.find((p) => p.id === id)
}

export const TOTAL_STEPS = {
  welcome: 0,
  quiz: 1,
  plan: 2,
  config: 3,
  ai: 4,
  celebration: 5,
}
