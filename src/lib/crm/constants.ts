export const PROSPECT_STATUSES = [
  { value: "nuevo", label: "Nuevo", color: "bg-blue-100 text-blue-700" },
  { value: "visitado", label: "Visitado", color: "bg-yellow-100 text-yellow-700" },
  { value: "interesado", label: "Interesado", color: "bg-purple-100 text-purple-700" },
  { value: "demo", label: "Demo", color: "bg-indigo-100 text-indigo-700" },
  { value: "negociacion", label: "Negociacion", color: "bg-orange-100 text-orange-700" },
  { value: "ganado", label: "Ganado", color: "bg-green-100 text-green-700" },
  { value: "perdido", label: "Perdido", color: "bg-red-100 text-red-700" },
] as const

export const PROSPECT_CATEGORIES = [
  "Ferreteria", "Supermercado", "Repuestos", "Farmacia", "Licoreria",
  "Barberia", "Salon", "Spa", "Doctor", "Odontologo",
  "Veterinario", "Hotel", "Restaurante", "Cafeteria", "Panaderia",
  "Zapateria", "Ropa", "Papeleria", "Otro",
] as const

export const ACTIVITY_TYPES = [
  { value: "visita", label: "Visita" },
  { value: "llamada", label: "Llamada" },
  { value: "seguimiento", label: "Seguimiento" },
  { value: "nota", label: "Nota" },
  { value: "tarea", label: "Tarea" },
  { value: "estado", label: "Cambio de estado" },
] as const

export const SALES_QUESTION_TYPES = [
  { value: "radio", label: "Opcion unica" },
  { value: "text", label: "Texto libre" },
  { value: "number", label: "Numero" },
  { value: "checklist", label: "Lista de verificacion" },
] as const

export const SALES_SECTION_TYPES = [
  { value: "questions", label: "Preguntas" },
  { value: "info", label: "Informativa (guia vendedor)" },
] as const

export const TEMPERATURE_MAP: Record<string, { label: string; color: string; min: number; max: number }> = {
  frio: { label: "Frio", color: "bg-blue-100 text-blue-700", min: 0, max: 25 },
  tibio: { label: "Tibio", color: "bg-yellow-100 text-yellow-700", min: 26, max: 50 },
  caliente: { label: "Caliente", color: "bg-orange-100 text-orange-700", min: 51, max: 75 },
  muy_caliente: { label: "Muy caliente", color: "bg-red-100 text-red-700", min: 76, max: 999 },
}

export const PLAN_RECOMMENDATIONS: Record<string, { label: string; precio: string; features: string[] }> = {
  agenda: { label: "Plan Agenda", precio: "$15/mes", features: ["1 empleado", "Agenda de citas", "Recordatorios"] },
  emprendedor: { label: "Plan Emprendedor", precio: "$25/mes", features: ["3 empleados", "Tienda online", "Inventario", "Reportes"] },
  empresarial: { label: "Plan Empresarial", precio: "$45/mes", features: ["10 empleados", "Multi-sucursal", "API", "Soporte prioritario"] },
}

export interface SalesRoute {
  value: string
  label: string
  plan: string
  descripcion: string
  disponible: boolean
}

export const SALES_ROUTES: SalesRoute[] = [
  {
    value: "emprendedor_presencial",
    label: "Venta presencial + POS + Inventario",
    plan: "emprendedor",
    descripcion: "Para negocios con tienda fisica: ferreterias, bodegones, farmacias, restaurantes, etc.",
    disponible: true,
  },
  {
    value: "emprendedor_online",
    label: "Tienda fisica + Venta online + Inventario",
    plan: "emprendedor",
    descripcion: "Para negocios que venden por redes sociales: ropa, accesorios, tecnologia, etc.",
    disponible: true,
  },
  {
    value: "agenda_salud",
    label: "Salud y profesionales medicos",
    plan: "agenda",
    descripcion: "Medicos, odontologos, psicologos, nutricionistas, veterinarios y profesionales que atienden pacientes mediante citas.",
    disponible: true,
  },
  {
    value: "agenda_belleza",
    label: "Barberias, belleza y estetica",
    plan: "agenda",
    descripcion: "Barberias, salones de belleza, spa, uñas, pestanas, masajes, centros esteticos.",
    disponible: true,
  },
  {
    value: "empresarial_default",
    label: "Guion especializado",
    plan: "empresarial",
    descripcion: "Proximo desarrollo — guion para negocios grandes con multi-sucursal.",
    disponible: false,
  },
]

export function getRoutesForPlan(plan: string): SalesRoute[] {
  return SALES_ROUTES.filter((r) => r.plan === plan)
}

export function getRouteInfo(value: string): SalesRoute {
  return SALES_ROUTES.find((r) => r.value === value) || SALES_ROUTES[0]
}

export const OBJECTION_RESPONSES: Record<string, { objecion: string; respuesta: string; ruta?: string }> = {
  metodo_actual: {
    objecion: "Estoy bien con mi metodo actual",
    respuesta: "Perfecto, muchos negocios empiezan asi. La pregunta es si ese metodo seguira funcionando cuando el negocio siga creciendo.",
  },
  esta_caro: {
    objecion: "Esta caro",
    respuesta: "Entiendo. La pregunta importante es cuanto cuesta actualmente no tener control sobre inventario, ventas o perdidas.",
  },
  no_tengo_tiempo: {
    objecion: "No tengo tiempo",
    respuesta: "Justamente la idea es ahorrar tiempo, no agregar mas trabajo.",
  },
  pensarlo: {
    objecion: "Tengo que pensarlo",
    respuesta: "Claro. Para ayudarte mejor, que parte necesitas evaluar: inversion, funcionamiento o necesidad?",
  },
  clientes_whatsapp: {
    objecion: "Mis clientes compran por WhatsApp",
    respuesta: "Perfecto, WhatsApp seguira funcionando. La tienda online ayuda a organizar ese proceso y evita perder tiempo enviando informacion repetida.",
    ruta: "emprendedor_online",
  },
  no_necesito_pagina: {
    objecion: "No necesito una pagina",
    respuesta: "No se trata solo de una pagina, sino de tener tus productos organizados y disponibles para tus clientes.",
    ruta: "emprendedor_online",
  },
  pacientes_whatsapp: {
    objecion: "Mis pacientes usan WhatsApp",
    respuesta: "Perfecto, WhatsApp puede seguir funcionando. Panitas simplemente organiza el proceso para evitar perder tiempo coordinando horarios.",
    ruta: "agenda_salud",
  },
  pocos_pacientes: {
    objecion: "Tengo pocos pacientes",
    respuesta: "Precisamente cuando se esta creciendo es el mejor momento para organizar la atencion.",
    ruta: "agenda_salud",
  },
  complicar_pacientes: {
    objecion: "No quiero complicar a mis pacientes",
    respuesta: "La experiencia es muy sencilla: el paciente selecciona servicio, horario y confirma.",
    ruta: "agenda_salud",
  },
  clientes_no_saben: {
    objecion: "Mis clientes no saben usar eso",
    respuesta: "No necesitan aprender todo de golpe. Puedes empezar con clientes nuevos o frecuentes. Despues de usarlo una vez, el proceso es muy sencillo.",
    ruta: "agenda_belleza",
  },
  clientes_prefieren_whatsapp: {
    objecion: "Mis clientes prefieren WhatsApp",
    respuesta: "WhatsApp seguira funcionando. El enlace simplemente evita que tengas que responder siempre las mismas preguntas.",
    ruta: "agenda_belleza",
  },
  no_cambiar: {
    objecion: "No quiero cambiar mi forma de trabajar",
    respuesta: "La idea no es cambiar todo de golpe, sino ayudarte a organizar mejor el proceso.",
    ruta: "agenda_belleza",
  },
}

export const DEMO_STEPS: Record<string, { titulo: string; pasos: string[] }> = {
  emprendedor_presencial: {
    titulo: "Demo — Venta Presencial",
    pasos: [
      "Dashboard del negocio",
      "Crear producto",
      "Registrar venta POS",
      "Actualizar inventario automaticamente",
      "Ver reportes",
      "Mostrar usuarios",
    ],
  },
  emprendedor_online: {
    titulo: "Demo — Tienda Online",
    pasos: [
      "Crear producto con foto",
      "Categorias",
      "Tienda online",
      "Cliente compra",
      "Inventario actualizado",
    ],
  },
  agenda_salud: {
    titulo: "Demo — Agenda Profesional",
    pasos: [
      "Perfil profesional",
      "Servicios y precios",
      "Horarios disponibles",
      "Enlace de reserva",
      "Paciente agenda cita",
      "Calendario profesional",
      "Estadisticas de citas",
    ],
  },
  agenda_belleza: {
    titulo: "Demo — Agenda de Belleza",
    pasos: [
      "Perfil del negocio",
      "Servicios y precios",
      "Link de reserva",
      "Cliente selecciona servicio",
      "Cliente selecciona horario",
      "Reserva confirmada",
      "Agenda del negocio",
      "Estadisticas de reservas",
    ],
  },
}

export function getStatusInfo(value: string) {
  return PROSPECT_STATUSES.find((s) => s.value === value) || PROSPECT_STATUSES[0]
}

export function getTemperatureInfo(value: string) {
  return TEMPERATURE_MAP[value] || TEMPERATURE_MAP.frio
}

export function getPlanInfo(value: string) {
  return PLAN_RECOMMENDATIONS[value] || PLAN_RECOMMENDATIONS.agenda
}

export const BUSINESS_TYPES_EMPRENDEDOR = [
  { value: "ferreteria", label: "Ferretería" },
  { value: "bodegon", label: "Bodegón" },
  { value: "supermercado", label: "Supermercado" },
  { value: "repuestos", label: "Repuestos" },
  { value: "farmacia", label: "Farmacia" },
  { value: "minimarket", label: "Minimarket" },
  { value: "panaderia", label: "Panadería" },
  { value: "restaurante", label: "Restaurante" },
  { value: "tienda_ropa", label: "Tienda de ropa" },
  { value: "zapateria", label: "Zapatería" },
  { value: "tecnologia", label: "Tecnología" },
  { value: "accesorios", label: "Accesorios" },
  { value: "cosmeticos", label: "Cosméticos" },
  { value: "otro_emprendedor", label: "Otro" },
] as const

export const SELLING_METHODS = [
  { value: "physical", label: "Principalmente en tienda física", route: "emprendedor_presencial" as const },
  { value: "physical_social", label: "Tienda física y redes sociales", route: "emprendedor_online" as const },
  { value: "online", label: "Solo venta online", route: "emprendedor_online" as const },
  { value: "unsure", label: "No estoy seguro", route: "emprendedor_presencial" as const },
] as const

export const BUSINESS_TYPES_SALUD = [
  { value: "medico", label: "Medico" },
  { value: "odontologo", label: "Odontologo" },
  { value: "psicologo", label: "Psicologo" },
  { value: "nutricionista", label: "Nutricionista" },
  { value: "fisioterapeuta", label: "Fisioterapeuta" },
  { value: "veterinario", label: "Veterinario" },
  { value: "otro_salud", label: "Otro profesional de salud" },
] as const

export const BUSINESS_TYPES_BELLEZA = [
  { value: "barberia", label: "Barberia" },
  { value: "salon_belleza", label: "Salon de belleza" },
  { value: "spa", label: "Spa" },
  { value: "unas", label: "Manicurista / Uñas" },
  { value: "pestanas", label: "Lashista / Pestañas" },
  { value: "masajes", label: "Masajista" },
  { value: "centro_estetico", label: "Centro estetico" },
  { value: "otro_belleza", label: "Otro negocio de belleza" },
] as const
