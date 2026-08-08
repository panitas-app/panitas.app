/**
 * Communication Integration Layer (FASE 7C) — Tipos y constantes.
 *
 * Contratos puros (sin Prisma, sin proveedores) de la capa de comunicación.
 * Define el modelo de mensaje unificado, el estado de los proveedores, la salud,
 * las métricas y el catálogo de eventos del dominio `communication`.
 * Este archivo NO importa Prisma: se puede consumir desde cualquier lado.
 */

// ─── Canales ────────────────────────────────────────────────────────────────

export const PROVIDER_CHANNEL_TYPES = ["whatsapp", "instagram", "messenger", "webchat", "email"] as const
export type ProviderChannelType = (typeof PROVIDER_CHANNEL_TYPES)[number]

export const PROVIDER_CHANNEL_META: Record<ProviderChannelType, { name: string; defaultProviderId: string }> = {
  whatsapp: { name: "WhatsApp", defaultProviderId: "mock-whatsapp" },
  instagram: { name: "Instagram", defaultProviderId: "mock-instagram" },
  messenger: { name: "Messenger", defaultProviderId: "mock-messenger" },
  webchat: { name: "Chat tienda online", defaultProviderId: "mock-webchat" },
  email: { name: "Email", defaultProviderId: "mock-email" },
}

// ─── Estado del proveedor ───────────────────────────────────────────────────

export const PROVIDER_STATUSES = ["connecting", "connected", "disconnected", "error"] as const
export type ProviderStatus = (typeof PROVIDER_STATUSES)[number]

export const PROVIDER_MESSAGE_STATUSES = ["received", "delivered", "read", "sent", "failed"] as const
export type ProviderMessageStatus = (typeof PROVIDER_MESSAGE_STATUSES)[number]

export const PROVIDER_SENDERS = ["customer", "agent", "system"] as const
export type ProviderSender = (typeof PROVIDER_SENDERS)[number]

// ─── Identidad del proveedor ────────────────────────────────────────────────

export interface ProviderMeta {
  id: string
  name: string
  channel: ProviderChannelType
  version: string
}

// ─── Mensaje unificado ──────────────────────────────────────────────────────

export interface ProviderAttachment {
  type: string
  url: string
  name?: string
  size?: number
  mediaId?: string
}

/** Modelo de mensaje unificado, independiente del proveedor de origen. */
export interface ProviderMessage {
  id: string
  channel: ProviderChannelType
  conversationId: string
  sender: ProviderSender
  recipient: string
  text: string
  attachments: ProviderAttachment[]
  timestamp: string
  metadata: Record<string, unknown>
  status: ProviderMessageStatus
}

// ─── Envío ─────────────────────────────────────────────────────────────────

export interface ProviderOutboundInput {
  channel: ProviderChannelType
  conversationId: string
  recipient: string
  text: string
  attachments?: ProviderAttachment[]
  metadata?: Record<string, unknown>
}

export interface ProviderSendResult {
  providerId: string
  channel: ProviderChannelType
  externalMessageId: string
  status: ProviderMessageStatus
  latencyMs: number
  retries: number
}

// ─── Conexión / desconeción ────────────────────────────────────────────────

export interface ProviderConnectionResult {
  providerId: string
  channel: ProviderChannelType
  status: ProviderStatus
  connectedAt: string
  info?: Record<string, unknown>
}

// ─── Salud ─────────────────────────────────────────────────────────────────

export interface ProviderHealth {
  providerId: string
  channel: ProviderChannelType
  status: ProviderStatus
  connected: boolean
  latencyMs: number | null
  lastSyncAt: string | null
  error?: string
  checkedAt: string
}

// ─── Métricas ──────────────────────────────────────────────────────────────

export interface ProviderMetrics {
  providerId: string
  channel: ProviderChannelType
  sent: number
  received: number
  errors: number
  retries: number
  /** Latencia media de envíos (ms). */
  avgLatencyMs: number
  /** Tiempo medio de respuesta simulada del proveedor (ms). */
  avgResponseMs: number
  since: string
}

// ─── Webhooks / eventos entrantes ───────────────────────────────────────────

export interface ProviderWebhookPayload {
  providerId: string
  channel: ProviderChannelType
  headers: Record<string, string>
  body: Record<string, unknown> | string
}

export interface ProviderInboundEvent {
  providerId: string
  channel: ProviderChannelType
  conversationId: string
  message: ProviderMessage
}

// ─── Vista de runtime (para UI/estado) ──────────────────────────────────────

export interface ProviderRuntimeView {
  providerId: string
  channel: ProviderChannelType
  name: string
  status: ProviderStatus
  connected: boolean
  connectedAt: string | null
  health: ProviderHealth | null
}

// ─── Eventos del dominio communication ──────────────────────────────────────

export const COMMUNICATION_EVENT_DOMAIN = "communication"

export const COMMUNICATION_EVENTS = [
  "channel.connected",
  "channel.disconnected",
  "message.received",
  "message.sent",
  "provider.error",
  "provider.retry",
] as const
export type CommunicationEventName = (typeof COMMUNICATION_EVENTS)[number]

export interface CommunicationEventRecord {
  tenantId: string
  type: CommunicationEventName
  providerId: string
  channel: ProviderChannelType
  occurredAt: string
  conversationId?: string
  messageId?: string
  error?: string
  attempts?: number
}
