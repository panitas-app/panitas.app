/**
 * Conversational AI Copilot (FASE 7B) — Tipos y constantes.
 *
 * Tipos puros (sin Prisma) del copiloto de conversaciones: taxonomía de
 * intenciones (multi-intención), resúmenes, respuestas sugeridas, acciones
 * inteligentes, consultas en lenguaje natural y memoria conversacional.
 * Este archivo NO importa Prisma: los componentes cliente pueden consumirlo.
 */
import type {
  InboxCustomerContext,
  InboxIntent,
  InboxMessageDTO,
  InboxOrderView,
  InboxSentiment,
  RecommendationTone,
} from "@/lib/inbox/conversation-types"

/** Dominio usado por los eventos de negocio del copiloto. */
export const COPILOT_EVENT_DOMAIN = "copilot"

/** Eventos de negocio publicados por el copiloto (FASE 7B). */
export const COPILOT_EVENTS = [
  "conversation.intent.detected",
  "conversation.summary.updated",
  "conversation.response.generated",
  "conversation.action.suggested",
] as const
export type CopilotEventName = (typeof COPILOT_EVENTS)[number]

// ─── Taxonomía de intenciones (multi-intención) ────────────────────────────

/** Intenciones que el copiloto puede detectar en un turno (varias a la vez). */
export const COPILOT_INTENTS = [
  "consulta_producto",
  "disponibilidad",
  "precio",
  "cotizacion",
  "pedido",
  "cobranza",
  "soporte",
  "garantia",
  "reclamo",
  "agendar_visita",
  "venta",
  "otro",
] as const
export type CopilotIntent = (typeof COPILOT_INTENTS)[number]

export const COPILOT_INTENT_LABELS: Record<CopilotIntent, string> = {
  consulta_producto: "Consulta de producto",
  disponibilidad: "Disponibilidad",
  precio: "Precio",
  cotizacion: "Cotización",
  pedido: "Pedido",
  cobranza: "Cobranza",
  soporte: "Soporte",
  garantia: "Garantía",
  reclamo: "Reclamo",
  agendar_visita: "Agendar visita",
  venta: "Venta",
  otro: "Otro",
}

/** Relación intención copiloto → etiqueta del inbox (7A). */
export const COPILOT_INTENT_TAG: Record<CopilotIntent, InboxIntent> = {
  consulta_producto: "venta",
  disponibilidad: "venta",
  precio: "venta",
  cotizacion: "venta",
  venta: "venta",
  pedido: "pedido",
  cobranza: "cobranza",
  soporte: "soporte",
  garantia: "soporte",
  reclamo: "reclamo",
  agendar_visita: "consulta",
  otro: "otro",
}

export type CopilotConfidence = "high" | "medium" | "low"

/** Detección de intención de un turno (puede incluir varias intenciones). */
export interface CopilotIntentDetection {
  /** Intenciones detectadas, ordenadas por relevancia (la primera es primaria). */
  intents: CopilotIntent[]
  primaryIntent: CopilotIntent
  sentiment: InboxSentiment
  topics: string[]
  confidence: CopilotConfidence
  /** Palabras clave que activaron cada intención. */
  signals: Partial<Record<CopilotIntent, string[]>>
}

// ─── Resumen ───────────────────────────────────────────────────────────────

export interface CopilotSummary {
  text: string
  intents: CopilotIntent[]
  keyFacts: string[]
  /** id del último mensaje cubierto por el resumen (para actualización incremental). */
  lastMessageId: string | null
  updatedAt: string
}

// ─── Respuestas sugeridas ──────────────────────────────────────────────────

export interface CopilotSuggestion {
  text: string
  /** Por qué se sugiere (para que el usuario decida con contexto). */
  rationale: string
  /** Fuentes de datos reales usadas (inventario, créditos, pedidos, crm...). */
  dataSources: string[]
  /** true cuando se basa en datos reales del negocio (nunca inventados). */
  grounded: boolean
}

// ─── Acciones inteligentes ─────────────────────────────────────────────────

export const COPILOT_ACTION_TYPES = [
  "create_quote",
  "create_order",
  "register_customer",
  "register_sale",
  "check_credit",
  "register_payment",
  "check_inventory",
  "open_customer_profile",
  "check_orders",
  "follow_up",
] as const
export type CopilotActionType = (typeof COPILOT_ACTION_TYPES)[number]

export interface CopilotAction {
  id: string
  type: CopilotActionType
  label: string
  description: string
  /** Ruta del dashboard a la que navega (null = acción a confirmar). */
  href: string | null
  payload?: Record<string, unknown>
  tone: RecommendationTone
}

/** Rutas reales del dashboard para cada acción. */
export const COPILOT_ACTION_HREFS: Record<CopilotActionType, string | null> = {
  create_quote: "/dashboard/pos",
  create_order: "/dashboard/pos",
  register_customer: "/dashboard/customers",
  register_sale: "/dashboard/pos",
  check_credit: "/dashboard/creditos",
  register_payment: "/dashboard/creditos",
  check_inventory: "/dashboard/products",
  open_customer_profile: "/dashboard/crm",
  check_orders: "/dashboard/orders",
  follow_up: "/dashboard/conversaciones",
}

// ─── Productos del inventario (para respuestas ancladas en datos) ───────────

export interface CopilotProductHit {
  productId: string
  name: string
  price: number
  stock: number
  sku: string | null
  categoryName: string | null
}

// ─── Contexto del cliente (copiloto) ───────────────────────────────────────

/** Extiende el contexto del inbox con datos agregados para el copiloto. */
export interface CopilotCustomerContext extends InboxCustomerContext {
  /** Pedidos no finalizados (pendientes, confirmados, preparando, envío). */
  pendingOrders: InboxOrderView[]
  /** pendingAmount + overdueAmount. */
  totalDebt: number
  /** Resumen de la conversación anterior del mismo cliente. */
  lastConversation: string | null
}

// ─── Consultas en lenguaje natural ──────────────────────────────────────────

export const COPILOT_QUERY_INTENTS = [
  "compras",
  "deuda",
  "ultima_compra",
  "pedidos_pendientes",
  "productos_frecuentes",
  "inventario",
  "cliente",
  "otro",
] as const
export type CopilotQueryIntent = (typeof COPILOT_QUERY_INTENTS)[number]

export interface CopilotQueryAnswer {
  question: string
  queryIntent: CopilotQueryIntent
  content: string
  dataSources: string[]
}

// ─── Memoria conversacional ────────────────────────────────────────────────

export type CopilotTone = "formal" | "amable" | "neutral"

export interface CopilotMemory {
  /** Tono preferido aprendido del negocio (formal, amable...). */
  tone: CopilotTone
  /** Frases frecuentes que el negocio usa al responder. */
  frequentResponses: string[]
  /** Nombres de los clientes con los que más conversa. */
  frequentCustomers: string[]
}

// ─── Análisis completo del copiloto ─────────────────────────────────────────

export interface CopilotAnalysis {
  conversationId: string
  generatedAt: string
  /** id del último mensaje analizado (para caché/incremental). */
  lastMessageId: string | null
  summary: CopilotSummary
  intent: CopilotIntentDetection
  suggestions: CopilotSuggestion[]
  actions: CopilotAction[]
  context: CopilotCustomerContext | null
  /** "ai" si el proveedor LLM contribuyó, "heuristic" si se usó la heurística. */
  source: "ai" | "heuristic"
  /** false si provino de la caché (no se reanalizó). */
  fresh: boolean
}

export type { InboxIntent, InboxMessageDTO, InboxOrderView, InboxSentiment, RecommendationTone }
