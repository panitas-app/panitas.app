/**
 * Conversation Summary (FASE 5C).
 *
 * Construye y actualiza el resumen ESTRUCTURADO de una conversación: temas,
 * hechos clave y acciones ejecutadas. Nunca guarda el historial crudo: solo
 * datos compactos que permitan restaurar el contexto sin repetir preguntas.
 *
 * Determinista y sin I/O: `conversation-manager.ts` decide cuándo persistirlo.
 */
import type {
  ActiveEntity,
  ConversationContextState,
  ConversationDomain,
  ConversationSummaryState,
  SummaryTopic,
} from "./conversation-types"

export const DEFAULT_SUMMARY_LIMITS = {
  maxKeyFacts: 12,
  maxOutcomes: 8,
  maxTopics: 10,
} as const

export interface SummaryLimits {
  maxKeyFacts?: number
  maxOutcomes?: number
  maxTopics?: number
}

const TOPIC_LABEL: Record<ConversationDomain, string> = {
  inventario: "Inventario",
  ventas: "Ventas",
  pedidos: "Pedidos",
  clientes: "Clientes",
  gastos: "Gastos",
  agenda: "Agenda",
  general: "General",
}

/** Crea un resumen vacío. */
export function createEmptySummary(now = new Date().toISOString()): ConversationSummaryState {
  return { topics: [], keyFacts: [], outcomes: [], messageCount: 0, updatedAt: now }
}

function cap<T>(items: T[], max: number): T[] {
  return items.slice(0, max)
}

function bumpTopic(topics: SummaryTopic[], domain: ConversationDomain, now: string, max: number): SummaryTopic[] {
  const label = TOPIC_LABEL[domain]
  const existing = topics.find((t) => t.name === label)
  if (existing) {
    return topics.map((t) => (t.name === label ? { ...t, mentions: t.mentions + 1, lastAt: now } : t))
  }
  return cap([{ name: label, mentions: 1, lastAt: now }, ...topics], max)
}

function prependFacts(facts: string[], next: string[], max: number): string[] {
  const deduped = next.filter((f) => f && !facts.includes(f))
  return cap([...deduped, ...facts], max)
}

/** Genera un hecho corto a partir de la entidad y parámetros del turno. */
export function factFromContext(context: ConversationContextState): string | null {
  if (context.domain === "general") return null
  const parts: string[] = []

  if (context.activeEntity) {
    parts.push(`${entityLabel(context.activeEntity)} "${context.activeEntity.name}"`)
  }
  for (const [key, value] of Object.entries(context.knownParams)) {
    if (key === "nombre") continue
    parts.push(`${paramLabel(key)} ${value}`)
  }
  if (parts.length === 0) return null
  return parts.join(" · ")
}

function entityLabel(entity: ActiveEntity): string {
  switch (entity.type) {
    case "product":
      return "Producto"
    case "customer":
      return "Cliente"
    case "order":
      return "Pedido"
    case "category":
      return "Categoría"
    case "appointment":
      return "Cita"
    default:
      return "Entidad"
  }
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

function outcomeFromTools(toolNames: string[]): string | null {
  const map: Record<string, string> = {
    "inventory.create_product": "Producto creado",
    "inventory.update_stock": "Stock actualizado",
    "inventory.delete_product": "Producto eliminado",
    "inventory.update_product": "Producto actualizado",
    "orders.update_status": "Pedido actualizado",
    "orders.delete_order": "Pedido eliminado",
    "customers.update_customer": "Cliente actualizado",
    "expenses.create_expense": "Gasto registrado",
    "appointments.update_appointment": "Cita actualizada",
  }
  const matched = toolNames.map((t) => map[t]).filter(Boolean)
  return matched.length > 0 ? matched[0] : toolNames.length > 0 ? "Acción ejecutada" : null
}

export interface SummaryTurnInput {
  userMessage: string
  assistantMessage: string
  domain: ConversationDomain
  context: ConversationContextState | null
  actionExecuted: boolean
  toolNames: string[]
}

/**
 * Actualiza el resumen con un turno completo (user + assistant).
 * Conserva hechos previos y descarta los más viejos cuando excede el límite.
 */
export function updateSummary(
  prev: ConversationSummaryState | null,
  input: SummaryTurnInput,
  now: string,
  limits: SummaryLimits = {},
): ConversationSummaryState {
  const current = prev ?? createEmptySummary(now)
  const maxFacts = limits.maxKeyFacts ?? DEFAULT_SUMMARY_LIMITS.maxKeyFacts
  const maxOutcomes = limits.maxOutcomes ?? DEFAULT_SUMMARY_LIMITS.maxOutcomes
  const maxTopics = limits.maxTopics ?? DEFAULT_SUMMARY_LIMITS.maxTopics

  const topics = bumpTopic(current.topics, input.domain, now, maxTopics)

  let keyFacts = current.keyFacts
  if (input.context) {
    const fact = factFromContext(input.context)
    if (fact) keyFacts = prependFacts(current.keyFacts, [fact], maxFacts)
  }

  let outcomes = current.outcomes
  if (input.actionExecuted) {
    const outcome = outcomeFromTools(input.toolNames)
    if (outcome) outcomes = cap([outcome, ...current.outcomes.filter((o) => o !== outcome)], maxOutcomes)
  }

  return {
    topics,
    keyFacts,
    outcomes,
    messageCount: current.messageCount + 2,
    updatedAt: now,
  }
}

/** Hecho legible a partir de un mensaje de usuario (fallback para historial previo). */
function factFromMessage(message: string): string | null {
  const trimmed = message.trim().replace(/\s+/g, " ")
  if (trimmed.length < 3) return null
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed
}

/**
 * Construye un resumen inicial desde el historial existente (conversaciones
 * creadas antes de FASE 5C), sin guardar el historial crudo.
 */
export function buildInitialSummary(
  messages: Array<{ role: string; content: string }>,
  now: string,
  limits: SummaryLimits = {},
): ConversationSummaryState {
  const maxFacts = limits.maxKeyFacts ?? DEFAULT_SUMMARY_LIMITS.maxKeyFacts
  const maxOutcomes = limits.maxOutcomes ?? DEFAULT_SUMMARY_LIMITS.maxOutcomes
  const maxTopics = limits.maxTopics ?? DEFAULT_SUMMARY_LIMITS.maxTopics

  const topics: SummaryTopic[] = []
  const keyFacts: string[] = []
  const outcomes: string[] = []

  for (const message of messages) {
    if (message.role !== "user") continue
    const fact = factFromMessage(message.content)
    if (fact) keyFacts.push(fact)
    if (keyFacts.length > maxFacts) keyFacts.shift()
  }

  return {
    topics: cap(topics, maxTopics),
    keyFacts: keyFacts.slice(-maxFacts),
    outcomes: cap(outcomes, maxOutcomes),
    messageCount: messages.length,
    updatedAt: now,
  }
}
