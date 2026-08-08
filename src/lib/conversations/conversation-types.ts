/**
 * Contratos de la Memoria Conversacional (FASE 5C).
 *
 * Modela el estado estructurado de una conversación — intención actual, entidad
 * activa, parámetros conocidos/pendientes, resumen y memoria optimizada — para
 * que el asistente recuerde contexto SIN enviar el historial completo al LLM.
 *
 * Regla de capas: este módulo NO conoce proveedores LLM ni Prisma. Solo define
 * los contratos que comparten `conversation-{context,memory,session,summary,
 * storage,search,manager}`.
 */

/** Dominios de negocio que rastrean el contexto conversacional. */
export const CONVERSATION_DOMAINS = [
  "inventario",
  "ventas",
  "pedidos",
  "clientes",
  "gastos",
  "agenda",
  "general",
] as const

export type ConversationDomain = (typeof CONVERSATION_DOMAINS)[number]

/** Tipo de entidad activa de la conversación. */
export const CONVERSATION_ENTITY_TYPES = [
  "product",
  "order",
  "customer",
  "expense",
  "category",
  "appointment",
  "none",
] as const

export type ConversationEntityType = (typeof CONVERSATION_ENTITY_TYPES)[number]

/** Entidad sobre la que se está trabajando en el turno actual. */
export interface ActiveEntity {
  type: ConversationEntityType
  /** Id de BD si ya existe; `null` si aún no se crea/identifica. */
  id: string | null
  /** Nombre o descriptor con el que el usuario la referencia. */
  name: string
}

/** Parámetro pendiente que el asistente debe pedir antes de ejecutar. */
export interface PendingParameter {
  key: string
  label: string
  /** Pregunta natural para pedir el dato al usuario. */
  prompt: string
}

/**
 * Estado del contexto de una conversación (persistido como JSON en
 * `Conversation.contextState`). Es la única fuente de "memoria corta" del turno.
 */
export interface ConversationContextState {
  version: number
  /** Intención actual (etiqueta corta: "inventario", "ventas", "gasto"...). */
  intent: string
  /** Acción actual ("crear producto", "consultar ventas", "eliminar orden"...). */
  action: string
  /** Dominio activo (para detectar cambio de tema). */
  domain: ConversationDomain
  /** Tema actual de la conversación. */
  topic: string
  /** Entidad sobre la que se trabaja; `null` si no hay. */
  activeEntity: ActiveEntity | null
  /** Parámetros ya conocidos (key → valor normalizado). */
  knownParams: Record<string, string>
  /** Parámetros que faltan por confirmar. */
  pendingParams: PendingParameter[]
  /** Estado del turno actual: activo, esperando detalles, confirmación o reintento. */
  status: "active" | "awaiting_details" | "awaiting_confirmation" | "awaiting_retry" | "ready"
  /** Id de la acción conversacional 5D en curso (si aplica). */
  actionId?: string
  /** Número de turnos de usuario procesados en este contexto. */
  turns: number
  /** TS ISO del último turno que actualizó el contexto. */
  updatedAt: string
  /** TS ISO del último cambio de tema. */
  lastTopicChangeAt: string
}

/** Un tema registrado en el resumen de la conversación. */
export interface SummaryTopic {
  name: string
  mentions: number
  lastAt: string
}

/**
 * Resumen estructurado de la conversación (persistido como JSON en
 * `Conversation.summary`). NO es el historial: son hechos y resultados compactos.
 */
export interface ConversationSummaryState {
  topics: SummaryTopic[]
  /** Hechos clave de la conversación (máx. N, recortados). */
  keyFacts: string[]
  /** Acciones ejecutadas con éxito. */
  outcomes: string[]
  /** Mensajes procesados (user + assistant). */
  messageCount: number
  updatedAt: string
}

/** Ámbito de aislamiento de una conversación (tenant + usuario). */
export interface ConversationTenant {
  userId: string
  storeId: string
  negocioId?: string | null
}

/** Estado de sesión completo que se restaura al reabrir una conversación. */
export interface ConversationSessionState {
  conversationId: string
  title: string
  status: string
  context: ConversationContextState | null
  summary: ConversationSummaryState | null
  /** Mensajes del historial (limitados), en orden cronológico. */
  messages: Array<{ id: string; role: "user" | "assistant"; content: string; timestamp: string }>
  messageCount: number
  updatedAt: string
}

/** Resultado de resolver un turno contra el contexto previo (antes del LLM). */
export interface PreparedTurn {
  conversationId: string
  /** Mensaje con referencias ya resueltas (o el original si no había). */
  resolvedMessage: string
  /** true si el mensaje referenciaba el contexto previo. */
  referenceResolved: boolean
  /** true si se detectó un cambio de tema (contexto reseteado). */
  topicChanged: boolean
  /** Contexto del turno (posiblemente ya reseteado por cambio de tema). */
  context: ConversationContextState
  /** Memoria optimizada lista para el LLM (nunca el historial completo). */
  memory: string
}

/** Datos de un turno completo para actualizar el contexto (después del LLM). */
export interface TurnOutcome {
  userMessage: string
  assistantMessage: string
  /** Nombres de tools ejecutadas (para detectar acción completada). */
  toolNames: string[]
  /** Intención final clasificada por la Intelligence Layer (si aplica). */
  intent?: string
  /** true si el turno requirió confirmación del usuario. */
  confirmed?: boolean
  /** FASE 5D: id de la acción conversacional en curso (para persistir el estado). */
  actionId?: string
  /** FASE 5D: parámetros conocidos de la acción en curso. */
  knownParams?: Record<string, string>
  /** FASE 5D: estado del contexto tras el turno (awating_details, confirmación, ...). */
  contextStatus?: ConversationContextState["status"]
}

/** Opciones configurables del ciclo de vida del contexto. */
export interface ContextLifecycleOptions {
  /** Milisegundos de inactividad tras los cuales el contexto se resetea. */
  inactivityMs: number
  /** Máximo de hechos a conservar en el resumen. */
  maxKeyFacts: number
  /** Máximo de resultados a conservar. */
  maxOutcomes: number
  /** Máximo de temas registrados. */
  maxTopics: number
}

/** DTO de una conversación para listas/búsqueda. */
export interface ConversationListItem {
  id: string
  title: string
  status: string
  createdAt: string
  updatedAt: string
  messageCount: number
  /** Snippet con el contexto del turno actual (para la búsqueda). */
  snippet?: string
}
