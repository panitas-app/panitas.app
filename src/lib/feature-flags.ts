export type PanitasPlan = "negocios" | "negocios_plus"

export type PanitasFeature =
  | "conversaciones"
  | "asistente_ia"
  | "sugerencias_ia"
  | "intencion_cliente"
  | "clientes_interesados"
  | "recomendaciones_comerciales"

export const PANITAS_PLAN_LABELS: Record<PanitasPlan, string> = {
  negocios: "Panitas Negocios",
  negocios_plus: "Panitas Negocios Plus",
}

export const PANITAS_FEATURE_LABELS: Record<PanitasFeature, string> = {
  conversaciones: "Conversaciones",
  asistente_ia: "Asistente con IA",
  sugerencias_ia: "Sugerencias de IA",
  intencion_cliente: "Intención de cliente",
  clientes_interesados: "Clientes interesados",
  recomendaciones_comerciales: "Recomendaciones comerciales",
}

export const PANITAS_FEATURE_DESCRIPTIONS: Record<PanitasFeature, string> = {
  conversaciones: "Chat centralizado con tus clientes desde un solo lugar.",
  asistente_ia: "Panitas responde preguntas de ventas, inventario y clientes.",
  sugerencias_ia: "Recomendaciones automáticas basadas en tus datos.",
  intencion_cliente: "Detecta quién está listo para comprar.",
  clientes_interesados: "Identifica clientes con interés en tu catálogo.",
  recomendaciones_comerciales: "Sugerencias de productos y precios para cada cliente.",
}

/** Características exclusivas del plan Plus */
const PLUS_FEATURES: PanitasFeature[] = [
  "conversaciones",
  "asistente_ia",
  "sugerencias_ia",
  "intencion_cliente",
  "clientes_interesados",
  "recomendaciones_comerciales",
]

export function isPlusPlan(planIdOrType: string | null | undefined): boolean {
  if (!planIdOrType) return false
  const p = planIdOrType.toLowerCase()
  return (
    p === "negocios_plus" ||
    p === "plus" ||
    p === "mayorista" ||
    p === "empresa" ||
    p === "empresarial"
  )
}

export function getPanitasPlan(planIdOrType: string | null | undefined): PanitasPlan {
  return isPlusPlan(planIdOrType) ? "negocios_plus" : "negocios"
}

export function canUseFeature(
  planIdOrType: string | null | undefined,
  feature: PanitasFeature,
): boolean {
  if (!PLUS_FEATURES.includes(feature)) return true
  return isPlusPlan(planIdOrType)
}
