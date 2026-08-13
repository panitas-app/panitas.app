/**
 * Platform (FASE 8D) — tipos de webhooks.
 */
export type WebhookSubscriptionStatus = "active" | "paused" | "dead_letter"
export type WebhookDeliveryStatus = "pending" | "success" | "failed" | "dead"

export interface WebhookSubscriptionRow {
  id: string
  storeId: string
  name: string
  endpoint: string
  events: string
  secret: string
  status: string
  failureCount: number
  lastDeliveryAt: Date | null
  lastDeliveryStatus: string | null
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
}

export interface WebhookDeliveryRow {
  id: string
  storeId: string
  subscriptionId: string
  eventId: string
  eventType: string
  status: string
  attempts: number
  lastAttemptAt: Date | null
  nextRetryAt: Date | null
  responseStatus: number | null
  responseBody: string | null
  error: string | null
  latencyMs: number | null
  payload: string | null
  createdAt: Date
  updatedAt: Date
}

/** Payload público enviado al endpoint (firmado). */
export interface WebhookPayload {
  /** Id único del evento → permite deduplicar en el receptor. */
  eventId: string
  type: string
  tenantId: string
  aggregateId?: string
  aggregateType?: string
  actorId?: string
  occurredAt: string
  data: unknown
  /** Hora de envío de ESTA entrega (para firma/anti-replay). */
  timestamp: number
}

/** Eventos por defecto sugeridos en la UI (no todos los del bus). */
export const SUGGESTED_WEBHOOK_EVENTS = [
  "customer.created",
  "customer.updated",
  "product.created",
  "product.updated",
  "order.created",
  "order.updated",
  "sale.created",
  "credit.created",
  "credit.payment.created",
  "supplier.payment.created",
  "conversation.created",
  "conversation.message.created",
  "attention.item.created",
  "attention.item.resolved",
] as const
