import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createWebhookDispatcher, type WebhookDispatcher } from "@/lib/platform/webhooks/dispatcher"
import type { DomainEvent, EventBus } from "@/lib/events"
import { makeFakeDb, makeSubscription, type FakeDb } from "./helpers"

const FIXED_NOW = new Date("2026-01-01T00:00:00.000Z")

function makeEvent(id: string, type: string, tenantId = "store-1"): DomainEvent {
  return {
    id,
    type,
    data: {},
    tenantId,
    source: "test",
    occurredAt: FIXED_NOW.toISOString(),
  } as DomainEvent
}

function makeBus() {
  const listeners: Array<(event: DomainEvent) => void | Promise<void>> = []
  const bus = {
    subscribeAll: vi.fn((listener: (event: DomainEvent) => void | Promise<void>) => {
      listeners.push(listener)
      return () => {
        const i = listeners.indexOf(listener)
        if (i >= 0) listeners.splice(i, 1)
      }
    }),
    _emit: (event: DomainEvent) => {
      for (const l of listeners) void l(event)
    },
  }
  return bus as unknown as EventBus & { _emit: (e: DomainEvent) => void }
}

function okAttempt() {
  return { ok: true, status: 200, responseBody: "{}", latencyMs: 5, error: null, retryable: false }
}

function failAttempt(status: number | null, retryable = true) {
  return { ok: false, status, responseBody: null, latencyMs: 5, error: `HTTP ${status}`, retryable }
}

describe("WebhookDispatcher (FASE 8D)", () => {
  let db: FakeDb
  let bus: ReturnType<typeof makeBus>
  let deliver: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
    db = makeFakeDb({ subscriptions: [makeSubscription()] })
    bus = makeBus()
    deliver = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function setup(maxAttempts = 5): { dispatcher: WebhookDispatcher; off: () => void } {
    const dispatcher = createWebhookDispatcher({
      db: db as never,
      deliver: deliver as never,
      now: () => FIXED_NOW,
      maxAttempts,
    })
    const off = dispatcher.register(bus as unknown as EventBus)
    return { dispatcher, off }
  }

  it("entrega un evento a una suscripción activa que lo escucha", async () => {
    const { dispatcher, off } = setup()
    deliver.mockResolvedValue(okAttempt())

    await dispatcher.onEvent(makeEvent("evt_1", "order.created"))
    await vi.advanceTimersByTimeAsync(10)

    expect(db._debug.deliveries).toHaveLength(1)
    expect(db._debug.deliveries[0].status).toBe("success")
    expect(db._debug.deliveries[0].eventId).toBe("evt_1")
    expect(db._debug.subscriptions[0].lastDeliveryStatus).toBe("success")
    expect(db._debug.subscriptions[0].failureCount).toBe(0)
    expect(deliver).toHaveBeenCalledTimes(1)
    off()
  })

  it("deduplica por [subscriptionId, eventId] (mismo evento no se re-encola)", async () => {
    const { dispatcher, off } = setup()
    deliver.mockResolvedValue(okAttempt())

    await dispatcher.onEvent(makeEvent("evt_1", "order.created"))
    await dispatcher.onEvent(makeEvent("evt_1", "order.created"))
    await vi.advanceTimersByTimeAsync(10)

    expect(db._debug.deliveries).toHaveLength(1)
    expect(deliver).toHaveBeenCalledTimes(1)
    off()
  })

  it("no entrega eventos fuera de los suscritos de la suscripción", async () => {
    const { dispatcher, off } = setup()
    deliver.mockResolvedValue(okAttempt())

    await dispatcher.onEvent(makeEvent("evt_1", "product.created"))
    await vi.advanceTimersByTimeAsync(10)

    expect(db._debug.deliveries).toHaveLength(0)
    expect(deliver).not.toHaveBeenCalled()
    off()
  })

  it("no entrega a suscripciones pausadas o de otra tienda", async () => {
    const { dispatcher, off } = setup()
    deliver.mockResolvedValue(okAttempt())

    await dispatcher.onEvent(makeEvent("evt_1", "order.created", "store-999"))
    await vi.advanceTimersByTimeAsync(10)

    expect(db._debug.deliveries).toHaveLength(0)
    off()
  })

  it("reintenta con backoff tras fallo recuperable", async () => {
    const { dispatcher, off } = setup()
    deliver
      .mockResolvedValueOnce(failAttempt(500))
      .mockResolvedValueOnce(failAttempt(503))
      .mockResolvedValueOnce(okAttempt())

    await dispatcher.onEvent(makeEvent("evt_1", "order.created"))
    // Intento 1 falla → schedule con backoff(1)=10s.
    await vi.advanceTimersByTimeAsync(10)
    // Intento 2 falla → schedule con backoff(2)=30s.
    await vi.advanceTimersByTimeAsync(10_000)
    // Intento 3 → éxito.
    await vi.advanceTimersByTimeAsync(30_000)

    expect(deliver).toHaveBeenCalledTimes(3)
    expect(db._debug.deliveries[0].status).toBe("success")
    expect(db._debug.deliveries[0].attempts).toBe(3)
    off()
  })

  it("no reintenta 4xx (no recuperable)", async () => {
    const { dispatcher, off } = setup()
    deliver.mockResolvedValue(failAttempt(400, false))

    await dispatcher.onEvent(makeEvent("evt_1", "order.created"))
    await vi.advanceTimersByTimeAsync(600_000)

    expect(deliver).toHaveBeenCalledTimes(1)
    expect(db._debug.deliveries[0].status).toBe("dead")
    off()
  })

  it("marca dead_letter tras fallos repetidos y no pierde el evento", async () => {
    const { dispatcher, off } = setup(2)
    deliver.mockResolvedValue(failAttempt(500, true))

    for (let i = 0; i < 10; i++) {
      await dispatcher.onEvent(makeEvent(`evt_${i}`, "order.created"))
      await vi.advanceTimersByTimeAsync(0)
      await vi.advanceTimersByTimeAsync(10_000)
    }

    const deadDeliveries = db._debug.deliveries.filter((d) => d.status === "dead")
    expect(deadDeliveries).toHaveLength(10)
    expect(db._debug.subscriptions[0].status).toBe("dead_letter")
    expect(db._debug.subscriptions[0].failureCount).toBe(10)
    off()
  })

  it("retryDelivery re-encola una entrega en dead-letter", async () => {
    db._debug.deliveries.push({
      id: "del-dead",
      storeId: "store-1",
      subscriptionId: "sub-1",
      eventId: "evt_old",
      eventType: "order.created",
      status: "dead",
      attempts: 5,
      lastAttemptAt: FIXED_NOW,
      nextRetryAt: null,
      responseStatus: 500,
      responseBody: null,
      error: "HTTP 500",
      latencyMs: 5,
      payload: null,
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
    })
    db._debug.subscriptions[0].failureCount = 10
    db._debug.subscriptions[0].status = "dead_letter"

    const { dispatcher, off } = setup()
    deliver.mockResolvedValue(okAttempt())

    const ok = await dispatcher.retryDelivery("del-dead", "store-1")
    expect(ok).toBe(true)
    await vi.advanceTimersByTimeAsync(10)

    expect(db._debug.deliveries.find((d) => d.id === "del-dead")?.status).toBe("success")
    // Reactivar y reentregar resetea el contador de fallos.
    expect(db._debug.subscriptions[0].failureCount).toBe(0)

    const denied = await dispatcher.retryDelivery("del-dead", "store-999")
    expect(denied).toBe(false)
    off()
  })

  it("el bus recibe el listener al registrar (subscribeAll)", () => {
    const { off } = setup()
    expect(bus.subscribeAll).toHaveBeenCalledTimes(1)
    off()
  })
})
