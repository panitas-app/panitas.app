import { hasFeature as hasFeatureInPlan, isBusinessPlus } from "@/lib/features"
import type { FeatureKey } from "@/lib/features"

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

/** Mapeo de features de FASE 2A a las features canónicas de la capa central. */
const FEATURE_TO_KEY: Record<PanitasFeature, FeatureKey> = {
  conversaciones: "unified_chat",
  asistente_ia: "basic_ai",
  sugerencias_ia: "ai_reply_suggestions",
  intencion_cliente: "customer_analysis",
  clientes_interesados: "customer_analysis",
  recomendaciones_comerciales: "sales_opportunities",
}

/**
 * Compatibilidad con FASE 2A: delega en la capa central `src/lib/features/`.
 * `asistente_ia` ya no es Plus: es `basic_ai`, incluido en Panitas Negocios.
 */
export function isPlusPlan(planIdOrType: string | null | undefined): boolean {
  return isBusinessPlus(planIdOrType)
}

export function getPanitasPlan(planIdOrType: string | null | undefined): PanitasPlan {
  return isPlusPlan(planIdOrType) ? "negocios_plus" : "negocios"
}

export function canUseFeature(
  planIdOrType: string | null | undefined,
  feature: PanitasFeature,
): boolean {
  return hasFeatureInPlan(planIdOrType, FEATURE_TO_KEY[feature])
}
