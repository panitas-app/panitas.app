/**
 * Conversational Memory (FASE 5C).
 *
 * Comprime el estado de la conversación en un fragmento OPTIMIZADO para el LLM:
 * solo intención, entidad activa, datos importantes y estado actual. NUNCA envía
 * el historial completo — ese sigue viniendo delimitado por `buildConversationalHistory`.
 *
 * Regla de capas: este módulo es puro (string → string) y no conoce I/O.
 */
import type { ConversationContextState, ConversationSummaryState } from "./conversation-types"

export const CONVERSATION_MEMORY_LIMITS = {
  /** Máximo de caracteres del fragmento de contexto para el LLM. */
  maxChars: 1200,
} as const

export interface MemoryFormatOptions {
  maxChars?: number
}

function paramLabel(key: string): string {
  switch (key) {
    case "cantidad":
      return "cantidad"
    case "precio":
      return "precio"
    case "monto":
      return "monto"
    case "categoria":
      return "categoría"
    case "descripcion":
      return "descripción"
    case "fecha":
      return "fecha"
    case "orden":
      return "orden por"
    default:
      return key
  }
}

/** Formatea el contexto del turno como texto compacto para el agente. */
export function formatContextMemory(
  context: ConversationContextState | null,
  options: MemoryFormatOptions = {},
): string {
  if (!context || context.domain === "general" || context.turns === 0) return ""

  const maxChars = options.maxChars ?? CONVERSATION_MEMORY_LIMITS.maxChars
  const lines: string[] = ["Contexto de esta conversación:"]

  lines.push(`- Tema: ${context.topic || context.domain}`)
  lines.push(`- Intención: ${context.intent}`)
  if (context.action) lines.push(`- Acción: ${context.action}`)

  if (context.activeEntity) {
    lines.push(`- Entidad activa: ${context.activeEntity.type} "${context.activeEntity.name}"`)
  }

  const known = Object.entries(context.knownParams)
  if (known.length > 0) {
    lines.push(`- Datos conocidos: ${known.map(([k, v]) => `${paramLabel(k)} ${v}`).join(", ")}`)
  }

  if (context.pendingParams.length > 0) {
    lines.push(`- Datos pendientes: ${context.pendingParams.map((p) => p.label).join(", ")}`)
  } else if (context.status === "ready") {
    lines.push("- Datos pendientes: ninguno")
  }

  let text = lines.join("\n")
  if (text.length > maxChars) {
    text = `${text.slice(0, maxChars)}…`
  }
  return text
}

/** Formatea el resumen estructurado como texto compacto (hechos y resultados). */
export function formatSummaryMemory(
  summary: ConversationSummaryState | null,
  options: MemoryFormatOptions = {},
): string {
  if (!summary) return ""
  const maxChars = options.maxChars ?? CONVERSATION_MEMORY_LIMITS.maxChars
  const lines: string[] = ["Resumen de esta conversación:"]

  if (summary.topics.length > 0) {
    lines.push(`- Temas: ${summary.topics.map((t) => `${t.name} (${t.mentions})`).join(", ")}`)
  }
  if (summary.keyFacts.length > 0) {
    lines.push(`- Hechos: ${summary.keyFacts.join(" | ")}`)
  }
  if (summary.outcomes.length > 0) {
    lines.push(`- Resultados: ${summary.outcomes.join(" | ")}`)
  }

  if (lines.length === 1) return ""
  let text = lines.join("\n")
  if (text.length > maxChars) {
    text = `${text.slice(0, maxChars)}…`
  }
  return text
}

/** Fragmento combinado de memoria conversacional para el request del agente. */
export function buildMemoryFragment(
  context: ConversationContextState | null,
  summary: ConversationSummaryState | null,
  options: MemoryFormatOptions = {},
): string {
  const contextPart = formatContextMemory(context, options)
  const summaryPart = formatSummaryMemory(summary, options)
  return [contextPart, summaryPart].filter(Boolean).join("\n\n")
}
