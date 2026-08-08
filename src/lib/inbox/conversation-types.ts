/**
 * Omnichannel Inbox — Tipos y constantes (FASE 7A).
 *
 * Centro Unificado de Conversaciones de Panitas Plus. Definiciones del dominio
 * del inbox, canales, estados, prioridades, etiquetas y DTOs serializables.
 * Sin acoplamiento a Prisma ni a proveedores externos de mensajería.
 */

export const INBOX_CHANNEL_TYPES = ["whatsapp", "instagram", "messenger", "webchat", "email", "other"] as const
export type InboxChannelType = (typeof INBOX_CHANNEL_TYPES)[number]

export const INBOX_CHANNEL_META: Record<InboxChannelType, { name: string; color: string }> = {
  whatsapp: { name: "WhatsApp", color: "#25D366" },
  instagram: { name: "Instagram", color: "#E1306C" },
  messenger: { name: "Messenger", color: "#0084FF" },
  webchat: { name: "Chat tienda online", color: "#6366f1" },
  email: { name: "Email", color: "#f59e0b" },
  other: { name: "Otro canal", color: "#94a3b8" },
}

/** Estados de la conversación ("ConversationStatus"). */
export const INBOX_STATUSES = ["nueva", "pendiente", "en_atencion", "resuelta", "archivada"] as const
export type InboxStatus = (typeof INBOX_STATUSES)[number]

export const INBOX_STATUS_META: Record<InboxStatus, { label: string }> = {
  nueva: { label: "Nueva" },
  pendiente: { label: "Pendiente" },
  en_atencion: { label: "En atención" },
  resuelta: { label: "Resuelta" },
  archivada: { label: "Archivada" },
}

export const INBOX_PRIORITIES = ["baja", "normal", "alta", "urgente"] as const
export type InboxPriority = (typeof INBOX_PRIORITIES)[number]

export const INBOX_TAGS = ["venta", "soporte", "cobranza", "consulta", "pedido", "reclamo", "otro"] as const
export type InboxTagName = (typeof INBOX_TAGS)[number]

/** Colores por defecto de las etiquetas estándar. */
export const INBOX_TAG_COLORS: Record<string, string> = {
  venta: "#10b981",
  soporte: "#6366f1",
  cobranza: "#f59e0b",
  consulta: "#0ea5e9",
  pedido: "#8b5cf6",
  reclamo: "#ef4444",
  otro: "#94a3b8",
}

export const INBOX_SENDERS = ["customer", "agent", "system"] as const
export type InboxSender = (typeof INBOX_SENDERS)[number]

/** Mensaje entrante: lado del cliente. */
export const INBOX_SENDER_CUSTOMER: InboxSender = "customer"
/** Mensaje del agente (el negocio responde). */
export const INBOX_SENDER_AGENT: InboxSender = "agent"
/** Mensaje del sistema (historial, notas automáticas). */
export const INBOX_SENDER_SYSTEM: InboxSender = "system"

export const INBOX_CONTENT_TYPES = ["text", "image", "file", "audio", "video"] as const
export type InboxContentType = (typeof INBOX_CONTENT_TYPES)[number]

export const INBOX_MESSAGE_STATUSES = ["received", "delivered", "read", "sent", "failed"] as const
export type InboxMessageStatus = (typeof INBOX_MESSAGE_STATUSES)[number]

/** Intenciones detectadas por la IA (cobranza/venta/soporte...). */
export const INBOX_INTENTS = ["venta", "soporte", "cobranza", "consulta", "pedido", "reclamo", "otro"] as const
export type InboxIntent = (typeof INBOX_INTENTS)[number]

export const INBOX_SENTIMENTS = ["positive", "neutral", "negative"] as const
export type InboxSentiment = (typeof INBOX_SENTIMENTS)[number]

/** Contexto de tenant de todos los servicios del inbox. */
export interface InboxContext {
  storeId: string
  userId?: string
  negocioId?: string | null
}

export interface InboxAttachment {
  type: string
  url: string
  name?: string
  size?: number
}

export interface InboxChannelDTO {
  id: string
  type: InboxChannelType
  name: string
  provider: string
  config: Record<string, unknown>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface InboxTagDTO {
  id: string
  name: string
  color: string
}

export interface InboxMessageDTO {
  id: string
  conversationId: string
  channel: InboxChannelType
  sender: InboxSender
  authorId: string | null
  senderName: string
  recipient: string
  content: string
  contentType: InboxContentType
  attachments: InboxAttachment[]
  status: InboxMessageStatus
  createdAt: string
}

export interface InboxParticipantDTO {
  id: string
  conversationId: string
  role: string
  name: string
  identifier: string
  channel: string
  userId: string | null
}

export interface InboxNoteDTO {
  id: string
  conversationId: string
  content: string
  createdBy: string | null
  createdAt: string
}

export interface InboxCustomerSummary {
  id: string
  name: string
  phone: string
  email: string | null
}

export interface InboxAssignedSummary {
  id: string
  name: string | null
  email: string | null
}

export interface InboxConversationSummary {
  id: string
  title: string
  channelType: InboxChannelType
  channelName: string
  status: InboxStatus
  priority: InboxPriority
  unreadCount: number
  isPinned: boolean
  customer: InboxCustomerSummary | null
  assignedTo: InboxAssignedSummary | null
  tags: string[]
  lastMessage: string
  lastMessageAt: string | null
  messageCount: number
  createdAt: string
  updatedAt: string
}

export interface InboxConversationDetail extends InboxConversationSummary {
  messages: InboxMessageDTO[]
  participants: InboxParticipantDTO[]
  notes: InboxNoteDTO[]
  externalRef: string | null
}

export interface InboxListOptions {
  status?: InboxStatus | "all"
  channel?: InboxChannelType | "all"
  tag?: string
  search?: string
  assigned?: string
  limit?: number
}

export interface InboxCreateInput {
  channelType: InboxChannelType
  title?: string
  customerId?: string
  identifier?: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  externalRef?: string
  initialMessage?: string
}

export interface InboxUpdateInput {
  status?: InboxStatus
  priority?: InboxPriority
  isPinned?: boolean
  title?: string
}

// ─── Análisis IA (tipos puros, sin Prisma) ─────────────────────────────────

export type InboxAiActionKind = "summary" | "intent" | "suggestion" | "relevant_history"

export interface InboxAiResult {
  kind: InboxAiActionKind
  content: string
  structured?: unknown
  source: "ai" | "heuristic"
  conversationId: string
  createdAt: string
}

// ─── Contexto del cliente (tipos puros, sin Prisma) ────────────────────────

export interface InboxOrderView {
  id: string
  orderNumber: string
  total: number
  status: string
  createdAt: string
  items: Array<{ productName: string; quantity: number }>
}

export interface InboxProductView {
  productId: string | null
  productName: string
  quantity: number
}

export interface InboxCreditView {
  activeCredits: number
  pendingAmount: number
  overdueAmount: number
  nextDueDate: string | null
}

export interface InboxInteractionView {
  type: "message" | "collection"
  channel: string
  summary: string
  createdAt: string
}

export interface InboxNoteView {
  type: "customer" | "conversation"
  content: string
  createdAt: string
}

export type RecommendationTone = "success" | "warning" | "danger" | "info" | "default"

export interface InboxRecommendation {
  id: string
  title: string
  description: string
  action: string
  tone: RecommendationTone
}

export interface InboxCustomerContext {
  customer: {
    id: string
    name: string
    phone: string
    email: string | null
    address: string | null
    city: string | null
    totalSpent: number
    totalOrders: number
    lastPurchaseAt: string | null
    tags: string[]
  } | null
  orders: InboxOrderView[]
  favoriteProducts: InboxProductView[]
  purchasedProductsCount: number
  credits: InboxCreditView
  recentInteractions: InboxInteractionView[]
  notes: InboxNoteView[]
  aiRecommendations: InboxRecommendation[]
}

export interface RecommendationSeed {
  customerName: string | null
  lastPurchaseAt: string | null
  totalSpent: number
  totalOrders: number
  activeCredits: number
  pendingAmount: number
  overdueAmount: number
  status: string
  lastMessageFromCustomer: boolean
  messageCount: number
}

/** Genera recomendaciones accionables a partir de datos reales (determinista). */
export function buildInboxRecommendations(data: RecommendationSeed): InboxRecommendation[] {
  const recommendations: InboxRecommendation[] = []
  const now = Date.now()
  const daysSince = (iso: string | null): number =>
    iso ? Math.max(0, Math.floor((now - new Date(iso).getTime()) / 86_400_000)) : Infinity

  if (data.overdueAmount > 0) {
    recommendations.push({
      id: "cobranza_vencida",
      title: "Créditos vencidos",
      description: `${data.customerName ?? "El cliente"} tiene ${data.overdueAmount.toFixed(2)} en cuotas vencidas.`,
      action: "Preparar un recordatorio de cobranza amable y registrar el contacto.",
      tone: "danger",
    })
  } else if (data.pendingAmount > 0) {
    recommendations.push({
      id: "cobranza_pendiente",
      title: "Crédito en curso",
      description: `${data.customerName ?? "El cliente"} mantiene ${data.pendingAmount.toFixed(2)} por pagar en cuotas vigentes.`,
      action: "Recordarle el próximo vencimiento antes de la fecha límite.",
      tone: "warning",
    })
  }

  if (data.lastPurchaseAt && daysSince(data.lastPurchaseAt) >= 30 && data.totalOrders > 0) {
    recommendations.push({
      id: "reactivacion",
      title: "Cliente inactivo",
      description: `${data.customerName ?? "El cliente"} no compra hace ${daysSince(data.lastPurchaseAt)} días.`,
      action: "Enviar una promoción o preguntarle qué necesita.",
      tone: "info",
    })
  }

  if (data.messageCount === 0 && data.customerName) {
    recommendations.push({
      id: "primer_contacto",
      title: "Primera interacción",
      description: "Es un contacto nuevo sin historial previo. Aprovecha para presentar tu negocio.",
      action: "Saludar y ofrecer ayuda con el catálogo.",
      tone: "info",
    })
  }

  if (data.totalSpent > 0) {
    recommendations.push({
      id: "venta_repetida",
      title: "Cliente recurrente",
      description: `${data.customerName ?? "El cliente"} ha gastado ${data.totalSpent.toFixed(2)} en ${data.totalOrders} compra(s).`,
      action: "Sugerir productos de la misma categoría que ya compró.",
      tone: "success",
    })
  }

  return recommendations
}
