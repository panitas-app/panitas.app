/**
 * Personalidad de Panitas (FASE 5F).
 *
 * Panitas habla como un gerente experimentado: profesional, claro y amable.
 * Nunca exagerada, infantil, robótica ni demasiado formal. Se implementa como
 * reglas deterministas:
 *   - frases prohibidas nunca aparecen en el texto generado,
 *   - las variantes de saludo se rotan sin repetir,
 *   - toda frase generada pasa por el sanitizador antes de salir.
 */
import type { AssistantRecommendationCategory, AssistantPriority } from "./types"

/** Frases que la personalidad prohíbe (lenguaje vacío o robótico). */
export const FORBIDDEN_PHRASES = [
  "como ia",
  "como un asistente de ia",
  "no puedo",
  "procesando",
  "procesando tu solicitud",
  "tu negocio está bien",
  "no encontramos nada",
  "todo funciona correctamente",
  "está todo en orden",
  "no hay nada que reportar",
] as const

/** Etiquetas de categoría para textos breves (singular). */
export const CATEGORY_LABELS: Record<AssistantRecommendationCategory, string> = {
  operacion: "operación",
  inventario: "inventario",
  finanzas: "finanzas",
  clientes: "clientes",
  proveedores: "proveedores",
}

/** Etiquetas de prioridad para textos breves. */
export const PRIORITY_LABELS: Record<AssistantPriority, string> = {
  alta: "alta",
  media: "media",
  baja: "baja",
}

/** Devuelve la frase prohibida que contiene el texto, si alguna. */
export function containsForbiddenPhrase(text: string): string | undefined {
  const normalized = text.toLocaleLowerCase("es-VE")
  return FORBIDDEN_PHRASES.find((phrase) => normalized.includes(phrase))
}

/** Elimina las frases prohibidas del texto (garantía de personalidad). */
export function sanitizeAssistantText(text: string): string {
  let result = text
  for (const phrase of FORBIDDEN_PHRASES) {
    result = result.split(new RegExp(phrase, "gi")).join("").trim()
  }
  return result.replace(/\s{2,}/g, " ").trim()
}

/** Falla si el texto contiene frases prohibidas (guardia en tests/engine). */
export function assertPersonalitySafe(text: string): void {
  const found = containsForbiddenPhrase(text)
  if (found) {
    throw new Error(`La personalidad de Panitas no puede decir "${found}": ${text}`)
  }
}

// ─── Variantes de saludo proactivo (sin repetición) ──────────────────────────
// Cada plantilla usa `{n}` (número de hallazgos) y `{w}` (punto/puntos).
// La variedad se logra rotando plantillas de forma determinista.

export const FINDINGS_GREETING_TEMPLATES = [
  "Revisé tu negocio y encontré {n} {w} para revisar.",
  "Antes de continuar, tienes {n} {w} que merecen tu atención.",
  "Encontré {n} {w} que vale la pena revisar hoy.",
  "Tenemos {n} {w} para atender cuando puedas.",
  "Hay {n} {w} que conviene mirar antes de seguir.",
] as const

/** Cierre neutro cuando no hay hallazgos (sin decir que "está bien"). */
export const NEUTRAL_GREETING_CLOSERS = [
  "¿En qué te ayudo hoy?",
  "¿Qué quieres revisar?",
  "Dime en qué puedo ayudarte.",
] as const

/** Texto de un hallazgo (plural correcto). */
export function findingsCountPhrase(count: number): string {
  const n = Math.max(0, count)
  return `${n} ${n === 1 ? "punto" : "puntos"}`
}

/** Parte del día según la hora (0-23). */
export function greetingPartOfDay(hour: number): string {
  if (hour < 12) return "Buenos días"
  if (hour < 19) return "Buenas tardes"
  return "Buenas noches"
}

/**
 * Índice determinista de plantilla, evitando repetir la usada antes.
 * `previousUsedIndex` es el índice de la plantilla del saludo anterior.
 */
export function pickGreetingTemplateIndex(
  options: { userName?: string; hour: number; previousUsedIndex?: number },
): number {
  const total = FINDINGS_GREETING_TEMPLATES.length
  if (total <= 1) return 0
  const seed = (options.userName?.length ?? 0) + options.hour
  let index = Math.abs(seed) % total
  if (options.previousUsedIndex !== undefined && options.previousUsedIndex === index) {
    index = (index + 1) % total
  }
  return index
}
