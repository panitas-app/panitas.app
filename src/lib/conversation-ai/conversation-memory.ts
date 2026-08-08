/**
 * Conversational AI Copilot (FASE 7B) — Memoria conversacional.
 *
 * La memoria estable del negocio aprende cómo responde el negocio: tono
 * preferido (formal/amable), frases frecuentes y clientes con los que más
 * conversa. Claves bajo `bm.preference.conversation.*` (preferencias) y
 * `bm.usage.conversation.*` (patrones de uso aprendidos por repetición). El
 * copiloto usa estos recuerdos para anclar sus sugerencias en el estilo real
 * del negocio.
 */
import type { BusinessMemoryEngine } from "@/lib/business-memory"
import type { MemoryContext } from "@/lib/agent/memory"
import type { CopilotMemory, CopilotTone } from "./conversation-types"

export const COPILOT_MEMORY_TONE_KEY = "bm.preference.conversation.tono"
export const COPILOT_MEMORY_RESPONSES_KEY = "bm.usage.conversation.respuestas_frecuentes"
export const COPILOT_MEMORY_CUSTOMERS_KEY = "bm.usage.conversation.clientes_frecuentes"

export interface CopilotMemorySignal {
  content?: string
  customerId?: string
  customerName?: string
}

const TONES: CopilotTone[] = ["formal", "amable", "neutral"]

const LIST_SEPARATOR = "||"

function parseList(value: unknown): string[] {
  if (typeof value !== "string" || !value.trim()) return []
  return value
    .split(LIST_SEPARATOR)
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 20)
}

function parseTone(value: unknown): CopilotTone {
  return typeof value === "string" && (TONES as string[]).includes(value) ? (value as CopilotTone) : "neutral"
}

function mergeList(current: string[], value: string, limit = 20): string[] {
  const next = [value, ...current.filter((v) => v !== value)]
  return next.slice(0, limit)
}

/** Detecta el tono de una respuesta escrita por el negocio. */
export function detectTone(content: string): CopilotTone {
  const lower = content.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  const amable = ["¡hola", "hola!", "😊", "mucho gusto", "con gusto", "un abrazo", "que tengas", "encantada", "con todo el gusto"]
  const formal = ["atentamente", "estimado", "cordial", "según lo solicitado", "le informo", "le confirmo", "saludos cordiales"]
  const a = amable.some((w) => lower.includes(w))
  const f = formal.some((w) => lower.includes(w))
  if (a && !f) return "amable"
  if (f && !a) return "formal"
  return "neutral"
}

/** Lee la memoria conversacional aprendida por el negocio. */
export async function readCopilotMemory(
  engine: BusinessMemoryEngine,
  ctx: MemoryContext,
): Promise<CopilotMemory> {
  const [tone, responses, customers] = await Promise.all([
    engine.get(ctx, COPILOT_MEMORY_TONE_KEY),
    engine.get(ctx, COPILOT_MEMORY_RESPONSES_KEY),
    engine.get(ctx, COPILOT_MEMORY_CUSTOMERS_KEY),
  ])
  return {
    tone: parseTone(tone?.value),
    frequentResponses: parseList(responses?.value),
    frequentCustomers: parseList(customers?.value),
  }
}

/** Aprende de un mensaje enviado por el negocio (tono y frase frecuente). */
export async function recordAgentMessage(
  engine: BusinessMemoryEngine,
  ctx: MemoryContext,
  signal: CopilotMemorySignal,
): Promise<void> {
  if (!signal.content || !signal.content.trim()) return
  const content = signal.content.trim()

  const tone = detectTone(content)
  if (tone !== "neutral") {
    const current = await engine.get(ctx, COPILOT_MEMORY_TONE_KEY)
    if (String(current?.value) !== tone) {
      await engine.observe(ctx, {
        key: COPILOT_MEMORY_TONE_KEY,
        kind: "preference",
        label: "Tono preferido de las respuestas",
        value: tone,
        domain: "conversation",
        tags: ["conversacion", "copiloto", "estilo"],
        explicit: false,
        ctx,
      })
    }
  }

  const current = await engine.get(ctx, COPILOT_MEMORY_RESPONSES_KEY)
  const merged = mergeList(parseList(current?.value), content.slice(0, 60))
  await engine.observe(ctx, {
    key: COPILOT_MEMORY_RESPONSES_KEY,
    kind: "usage_pattern",
    label: "Respuestas frecuentes del negocio",
    value: merged.join(LIST_SEPARATOR),
    domain: "conversation",
    tags: ["conversacion", "copiloto", "respuestas frecuentes"],
    explicit: false,
    ctx,
  })
}

/** Aprende clientes con los que el negocio conversa con frecuencia. */
export async function recordCopilotCustomer(
  engine: BusinessMemoryEngine,
  ctx: MemoryContext,
  signal: CopilotMemorySignal,
): Promise<void> {
  if (!signal.customerId) return
  const name = signal.customerName?.trim() || signal.customerId
  const current = await engine.get(ctx, COPILOT_MEMORY_CUSTOMERS_KEY)
  const merged = mergeList(parseList(current?.value), name.slice(0, 60))
  await engine.observe(ctx, {
    key: COPILOT_MEMORY_CUSTOMERS_KEY,
    kind: "usage_pattern",
    label: "Clientes frecuentes de conversaciones",
    value: merged.join(LIST_SEPARATOR),
    domain: "conversation",
    tags: ["conversacion", "copiloto", "clientes frecuentes"],
    explicit: false,
    ctx,
  })
}
