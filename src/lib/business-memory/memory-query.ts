/**
 * Consulta por intención de la memoria estable del negocio (FASE 5G).
 *
 * El agente NUNCA recibe toda la memoria: antes de responder se recuperan SOLO
 * los recuerdos relevantes para la consulta actual y se formatea un fragmento
 * compacto para el system prompt.
 *
 * Relevancia (ranking determinista):
 *
 *   - coincidencia de tokens del mensaje con etiquetas/label/valor
 *   - dominio detectado en el mensaje o el intento
 *   - importancia del recuerdo (CRITICAL > HIGH > MEDIUM > LOW)
 *   - frecuencia de acceso (log) y recencia como desempate
 *
 * El ranking y el formateo son funciones puras (testeables sin BD).
 */
import type {
  BusinessMemoryItem,
  BusinessMemoryStore,
  IntentQuery,
  IntentQueryResult,
} from "./memory-types"
import type { MemoryContext } from "@/lib/agent/memory"
import { detectDomain } from "./memory-rules"

const IMPORTANCE_SCORE: Record<string, number> = {
  LOW: 0.5,
  MEDIUM: 1,
  HIGH: 1.5,
  CRITICAL: 2,
}

const DEFAULT_LIMIT = 5

function tokensOf(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-záéíóúñü0-9]+/)
      .filter((t) => t.length > 2),
  )
}

function valueTokens(item: BusinessMemoryItem): string {
  const value = typeof item.value === "string" ? item.value : JSON.stringify(item.value ?? "")
  return `${item.label} ${item.key} ${item.metadata.tags.join(" ")} ${value}`.toLowerCase()
}

/** Puntaje de relevancia puro entre un recuerdo y la consulta. */
export function relevanceScore(item: BusinessMemoryItem, query: IntentQuery): number {
  const messageTokens = tokensOf(query.message)
  const itemTokens = tokensOf(valueTokens(item))
  let score = 0

  for (const token of itemTokens) {
    if (messageTokens.has(token)) score += 1
  }

  const domain = detectDomain(query.message, query.intent)
  if (domain && item.metadata.domain === domain) score += 2
  if (query.intent && item.metadata.domain && query.intent.toLowerCase().includes(item.metadata.domain)) score += 1

  score += IMPORTANCE_SCORE[item.importance] ?? 0.5
  score += Math.log1p(item.accessCount) * 0.2

  const ageMs = Date.now() - new Date(item.updatedAt).getTime()
  score += Math.max(0, 1 - ageMs / (30 * 24 * 60 * 60 * 1000)) * 0.1

  return score
}

/** Descripción legible de un recuerdo para el fragmento del prompt y el panel. */
export function describeMemory(item: BusinessMemoryItem): string {
  const value = item.value as Record<string, unknown>
  switch (item.kind) {
    case "terminology":
      return `Usas "${String(value.term ?? "")}" para referirte a "${String(value.standard ?? "")}"`
    case "preference": {
      if (typeof item.value === "boolean") return item.label
      if (value.currency) return `Moneda principal: ${String(value.currency)}`
      return item.label
    }
    case "operational_rule":
      return String(value.rule ?? item.label)
    case "usage_pattern":
      return `Consultas frecuentes del negocio: ${String(value.domain ?? item.label)}`
    default:
      return item.label
  }
}

export function formatMemoryContext(items: BusinessMemoryItem[]): string {
  if (items.length === 0) return ""
  const lines = ["Memoria estable del negocio (relevante para esta consulta):"]
  for (const item of items) {
    lines.push(`- ${item.kind === "terminology" ? "Terminología" : item.kind === "preference" ? "Preferencia" : item.kind === "operational_rule" ? "Regla operativa" : "Patrón de uso"}: ${describeMemory(item)}`)
  }
  return lines.join("\n")
}

export class BusinessMemoryQuerier {
  constructor(private readonly store: BusinessMemoryStore) {}

  async queryForIntent(ctx: MemoryContext, query: IntentQuery): Promise<IntentQueryResult> {
    const limit = query.limit ?? DEFAULT_LIMIT
    const all = await this.store.list(ctx, { includeExpired: true })

    const ranked = all
      .filter((item) => item.status === "confirmed")
      .map((item) => ({ item, score: relevanceScore(item, query) }))
      .sort((a, b) => b.score - a.score)

    const items = ranked.slice(0, Math.max(limit, 1)).map((r) => r.item)

    for (const item of items) {
      void this.store.touch(ctx, item.key).catch(() => undefined)
    }

    return { items, context: formatMemoryContext(items) }
  }
}
