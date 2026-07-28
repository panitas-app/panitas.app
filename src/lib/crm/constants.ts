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

export function getStatusInfo(value: string) {
  return PROSPECT_STATUSES.find((s) => s.value === value) || PROSPECT_STATUSES[0]
}

export function getTemperatureInfo(value: string) {
  return TEMPERATURE_MAP[value] || TEMPERATURE_MAP.frio
}

export function getPlanInfo(value: string) {
  return PLAN_RECOMMENDATIONS[value] || PLAN_RECOMMENDATIONS.agenda
}
