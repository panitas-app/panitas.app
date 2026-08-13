/**
 * Platform (FASE 8D) — WebhookDispatcher.
 *
 * Consume Business Events (sin crear un segundo sistema de eventos):
 *
 *   Business Event → Webhook Dispatcher → External Endpoint (firmado)
 *
 * - Deduplicación por eventId (único [subscriptionId, eventId]).
 * - Reintentos con backoff (máx 5 intentos, sin loops infinitos).
 * - Dead-letter: fallos repetidos marcan la suscripción como dead_letter.
 * - Nunca bloquea el request principal: todo es fire-and-forget + timers.
 */
import type { PrismaClient } from "@prisma/client"
import { prisma as defaultPrisma } from "@/lib/prisma"
import type { DomainEvent, EventBus } from "@/lib/events"
import type { WebhookDeliveryRow, WebhookSubscriptionRow } from "./types"
import { parseEvents } from "./service"
import { buildPayloadJson, deliverOnce, backoffForAttempt, type DeliveryAttempt } from "./deliver"
import { assertSafeEndpoint } from "./ssrf"

export interface WebhookDispatcherOptions {
  db?: PrismaClient
  /** Inyectable para tests. */
  deliver?: typeof deliverOnce
  maxAttempts?: number
  now?: () => Date
}

export interface WebhookDispatcher {
  /** Registra el listener sobre el bus. Devuelve la función de desregistro. */
  register(bus: EventBus): () => void
  /** Maneja un evento (dedupe + enqueue). Fire-and-forget desde el bus. */
  onEvent(event: DomainEvent): Promise<void>
  /** Reintenta manualmente una entrega en dead-letter (la re-encola). */
  retryDelivery(deliveryId: string, storeId: string): Promise<boolean>
}

export function createWebhookDispatcher(options: WebhookDispatcherOptions = {}): WebhookDispatcher {
  const db = options.db ?? defaultPrisma
  const deliver = options.deliver ?? deliverOnce
  const maxAttempts = options.maxAttempts ?? 5
  const now = options.now ?? (() => new Date())
  const pendingTimers = new Set<NodeJS.Timeout>()

  function schedule(delivery: WebhookDeliveryRow, delayMs: number): void {
    const timer = setTimeout(() => {
      pendingTimers.delete(timer)
      void attemptDelivery(delivery).catch(() => {})
    }, delayMs)
    pendingTimers.add(timer)
    timer.unref?.()
  }

  async function attemptDelivery(delivery: WebhookDeliveryRow): Promise<void> {
    const sub = await db.webhookSubscription.findUnique({ where: { id: delivery.subscriptionId } })
    if (!sub || sub.status !== "active") return

    // Re-validación SSRF en cada intento (DNS cacheado 60s).
    let endpoint: string
    try {
      endpoint = await assertSafeEndpoint(sub.endpoint)
    } catch {
      await finalizeDead(delivery, sub, "Endpoint bloqueado por seguridad SSRF")
      return
    }

    const event = delivery.payload ? safeParseEvent(delivery.payload) : null
    const payloadJson = buildPayloadJson(sub, {
      eventId: delivery.eventId,
      type: delivery.eventType,
      tenantId: delivery.storeId,
      occurredAt: delivery.createdAt.toISOString(),
      data: event?.data ?? {},
      aggregateId: event?.aggregateId,
      aggregateType: event?.aggregateType,
      actorId: event?.actorId,
    })

    const attempt = await deliver(payloadJson, endpoint, sub.secret, delivery.eventId, delivery.id)

    const attempts = delivery.attempts + 1
    if (attempt.ok) {
      await db.webhookDelivery.update({
        where: { id: delivery.id },
        data: { status: "success", attempts, lastAttemptAt: now(), responseStatus: attempt.status, responseBody: attempt.responseBody, error: null, latencyMs: attempt.latencyMs, nextRetryAt: null },
      })
      await db.webhookSubscription.update({
        where: { id: sub.id },
        data: { lastDeliveryAt: now(), lastDeliveryStatus: "success", failureCount: 0 },
      })
      return
    }

    if (attempt.retryable && attempts < maxAttempts) {
      const backoff = backoffForAttempt(attempts)
      const nextRetryAt = new Date(now().getTime() + backoff)
      const updated = await db.webhookDelivery.update({
        where: { id: delivery.id },
        data: { status: "failed", attempts, lastAttemptAt: now(), responseStatus: attempt.status, responseBody: attempt.responseBody, error: attempt.error, latencyMs: attempt.latencyMs, nextRetryAt },
      })
      await db.webhookSubscription.update({
        where: { id: sub.id },
        data: { lastDeliveryAt: now(), lastDeliveryStatus: "failed" },
      })
      schedule(updated, backoff)
      return
    }

    await finalizeDead(delivery, sub, attempt.error ?? "Entrega fallida sin error", attempts, attempt)
  }

  async function finalizeDead(
    delivery: WebhookDeliveryRow,
    sub: WebhookSubscriptionRow,
    error: string,
    attempts?: number,
    attempt?: DeliveryAttempt
  ): Promise<void> {
    await db.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "dead",
        attempts: attempts ?? delivery.attempts + 1,
        lastAttemptAt: now(),
        responseStatus: attempt?.status ?? null,
        responseBody: attempt?.responseBody ?? null,
        error: error.slice(0, 500),
        latencyMs: attempt?.latencyMs ?? null,
        nextRetryAt: null,
      },
    })
    const failureCount = sub.failureCount + 1
    const data: Record<string, unknown> = { lastDeliveryAt: now(), lastDeliveryStatus: "failed", failureCount }
    if (failureCount >= 10) data.status = "dead_letter"
    await db.webhookSubscription.update({ where: { id: sub.id }, data })
  }

  async function handleEvent(event: DomainEvent): Promise<void> {
    const subscriptions = await db.webhookSubscription.findMany({
      where: { storeId: event.tenantId, status: "active" },
    })
    if (subscriptions.length === 0) return

    for (const sub of subscriptions) {
      if (!parseEvents(sub.events).includes(event.type)) continue
      const existing = await db.webhookDelivery.findUnique({
        where: { subscriptionId_eventId: { subscriptionId: sub.id, eventId: event.id } },
      })
      if (existing) continue // dedupe: ya encolado/entregado

      const delivery = await db.webhookDelivery.create({
        data: {
          storeId: event.tenantId,
          subscriptionId: sub.id,
          eventId: event.id,
          eventType: event.type,
          payload: JSON.stringify(event),
          status: "pending",
        },
      })
      schedule(delivery, 0)
    }
  }

  async function retryDelivery(deliveryId: string, storeId: string): Promise<boolean> {
    const delivery = await db.webhookDelivery.findFirst({ where: { id: deliveryId, storeId } })
    if (!delivery || delivery.status !== "dead") return false
    const sub = await db.webhookSubscription.findUnique({ where: { id: delivery.subscriptionId } })
    // El reintento manual reactiva la suscripción (incluso desde dead_letter);
    // solo se deniega si está pausada/revocada o no existe.
    if (!sub || (sub.status !== "active" && sub.status !== "dead_letter")) return false

    await db.webhookDelivery.update({
      where: { id: delivery.id },
      data: { status: "pending", attempts: 0, error: null, responseStatus: null, responseBody: null, nextRetryAt: null },
    })
    await db.webhookSubscription.update({
      where: { id: sub.id },
      data: { status: "active", failureCount: 0 },
    })
    schedule(delivery, 0)
    return true
  }

  return {
    register(bus: EventBus): () => void {
      const off = bus.subscribeAll((event: DomainEvent) => {
        void handleEvent(event).catch((error) => {
          console.error("[webhooks] dispatch falló:", String(error))
        })
      })
      return () => {
        off()
        for (const timer of pendingTimers) clearTimeout(timer)
        pendingTimers.clear()
      }
    },
    onEvent: handleEvent,
    retryDelivery,
  }
}

function safeParseEvent(payload: string | null): { data: unknown; aggregateId?: string; aggregateType?: string; actorId?: string } | null {
  if (!payload) return null
  try {
    const parsed = JSON.parse(payload) as {
      data?: unknown
      aggregateId?: string
      aggregateType?: string
      actorId?: string
    }
    return {
      data: parsed.data,
      aggregateId: parsed.aggregateId,
      aggregateType: parsed.aggregateType,
      actorId: parsed.actorId,
    }
  } catch {
    return null
  }
}
