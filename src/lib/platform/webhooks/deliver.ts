/**
 * Platform (FASE 8D) — entrega de un webhook a un endpoint externo.
 * Con timeout, registro de intento y política de reintento.
 */
import { ApiError } from "@/lib/platform/errors"
import type { WebhookSubscriptionRow, WebhookPayload } from "./types"
import { signPayload, SIGNATURE_HEADER, EVENT_ID_HEADER, DELIVERY_ID_HEADER } from "./signature"

export const DELIVERY_TIMEOUT_MS = 10_000
export const MAX_DELIVERY_ATTEMPTS = 5
/** Backoff entre intentos (ms). Índice = intento (1-based). */
export const RETRY_BACKOFF_MS = [0, 10_000, 30_000, 120_000, 600_000] as const

export interface DeliveryAttempt {
  ok: boolean
  status: number | null
  responseBody: string | null
  latencyMs: number
  error: string | null
  retryable: boolean
}

export function buildPayloadJson(subscription: Pick<WebhookSubscriptionRow, "endpoint">, event: {
  eventId: string
  type: string
  tenantId: string
  aggregateId?: string
  aggregateType?: string
  actorId?: string
  occurredAt: string
  data: unknown
}): string {
  const payload: WebhookPayload = {
    eventId: event.eventId,
    type: event.type,
    tenantId: event.tenantId,
    aggregateId: event.aggregateId,
    aggregateType: event.aggregateType,
    actorId: event.actorId,
    occurredAt: event.occurredAt,
    data: event.data,
    timestamp: Date.now(),
  }
  return JSON.stringify(payload)
}

/** Decide si un fallo debe reintentarse (5xx, 429 y errores de red → sí; 4xx → no). */
export function isRetryable(status: number | null, error: string | null): boolean {
  if (status !== null) {
    if (status >= 500) return true
    if (status === 429) return true
    return false
  }
  // Error de red/tiempo sin respuesta HTTP → reintentar.
  return error !== null
}

export async function deliverOnce(
  payloadJson: string,
  endpoint: string,
  secret: string,
  eventId: string,
  deliveryId: string,
  timeoutMs = DELIVERY_TIMEOUT_MS
): Promise<DeliveryAttempt> {
  const startedAt = Date.now()
  const timestamp = Date.now()
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Panitas-Webhook/1.0",
        [SIGNATURE_HEADER]: signPayload(payloadJson, secret, timestamp),
        [EVENT_ID_HEADER]: eventId,
        [DELIVERY_ID_HEADER]: deliveryId,
      },
      body: payloadJson,
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "error",
    })
    const latencyMs = Date.now() - startedAt
    const text = await response.text().catch(() => null)
    const status = response.status
    return {
      ok: status >= 200 && status < 300,
      status,
      responseBody: text ? text.slice(0, 2000) : null,
      latencyMs,
      error: status >= 200 && status < 300 ? null : `HTTP ${status}`,
      retryable: isRetryable(status, null),
    }
  } catch (error) {
    const latencyMs = Date.now() - startedAt
    const message = error instanceof Error ? error.message : String(error)
    return {
      ok: false,
      status: null,
      responseBody: null,
      latencyMs,
      error: message.slice(0, 500),
      retryable: true,
    }
  }
}

export function backoffForAttempt(attempt: number): number {
  return RETRY_BACKOFF_MS[Math.min(attempt, RETRY_BACKOFF_MS.length - 1)] ?? 600_000
}

export function assertSubscriptionActive(subscription: Pick<WebhookSubscriptionRow, "status">): void {
  if (subscription.status !== "active") {
    throw new ApiError("WEBHOOK_DELIVERY_FAILED", "La suscripción de webhook no está activa", 400)
  }
}
