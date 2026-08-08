import { describe, expect, it, vi } from "vitest"
import {
  EventBus,
  correlationMiddleware,
  tenantIsolationMiddleware,
  buildNotification,
  createConversationEventHistory,
  createEventAnalytics,
  createEventFeed,
  registerBusinessMemoryListener,
  registerBusinessMonitorListener,
  registerNotificationsListener,
  registerRecommendationsListener,
  type NotificationChannel,
  type NotificationMessage,
} from "@/lib/events"
import { BusinessMemoryEngine, createInMemoryBusinessMemoryStore } from "@/lib/business-memory"
import type { MemoryContext } from "@/lib/agent/memory"

const flush = () => new Promise((r) => setTimeout(r, 20))

function bus() {
  const b = new EventBus()
  b.use(correlationMiddleware())
  b.use(tenantIsolationMiddleware())
  return b
}

function sale(tenantId = "store-1", total = 100) {
  return { type: "sale.created", data: { total }, tenantId, source: "test" }
}

function completedSale(tenantId = "store-1", total = 100) {
  return { type: "sale.completed", data: { total }, tenantId, source: "test" }
}

describe("analytics listener", () => {
  it("agrega ventas, órdenes y gastos por tienda", async () => {
    const analytics = createEventAnalytics()
    const b = bus()
    analytics.register(b)
    await b.publish(sale("store-1", 100))
    await b.publish(completedSale("store-1", 100))
    await b.publish({ type: "expense.created", data: { amount: 30 }, tenantId: "store-1", source: "test" })
    const snap = analytics.snapshot("store-1")
    expect(snap.sales.count).toBe(1)
    expect(snap.sales.revenue).toBe(100)
    expect(snap.orders.count).toBe(1)
    expect(snap.expenses.total).toBe(30)
    expect(snap.totalEvents).toBe(3)
  })

  it("no cuenta dos veces la misma venta completada", async () => {
    const analytics = createEventAnalytics()
    const b = bus()
    analytics.register(b)
    await b.publish(sale("store-1", 100))
    await b.publish(completedSale("store-1", 100))
    const snap = analytics.snapshot("store-1")
    expect(snap.sales.count).toBe(1)
    expect(snap.orders.count).toBe(1)
  })

  it("descuenta las ventas canceladas de las órdenes", async () => {
    const analytics = createEventAnalytics()
    const b = bus()
    analytics.register(b)
    await b.publish(sale("store-1", 100))
    await b.publish({ type: "sale.cancelled", data: { total: 100 }, tenantId: "store-1", source: "test" })
    expect(analytics.snapshot("store-1").orders.count).toBe(0)
  })

  it("aísla las estadísticas por tienda", async () => {
    const analytics = createEventAnalytics()
    const b = bus()
    analytics.register(b)
    await b.publish(completedSale("store-1", 100))
    await b.publish(completedSale("store-2", 200))
    expect(analytics.snapshot("store-1").sales.revenue).toBe(100)
    expect(analytics.snapshot("store-2").sales.revenue).toBe(200)
  })
})

describe("dashboard listener", () => {
  it("mantiene un feed resumido por tienda", async () => {
    const feed = createEventFeed()
    const b = bus()
    feed.register(b)
    await b.publish({ type: "product.created", data: { name: "Manzana" }, tenantId: "store-1", source: "test" })
    const items = feed.recent("store-1")
    expect(items).toHaveLength(1)
    expect(items[0].summary).toBe("Producto creado: Manzana")
    expect(items[0].category).toBe("products")
  })

  it("no mezcla feeds entre tiendas", async () => {
    const feed = createEventFeed()
    const b = bus()
    feed.register(b)
    await b.publish({ type: "sale.created", data: { total: 10 }, tenantId: "store-1", source: "test" })
    expect(feed.recent("store-2")).toHaveLength(0)
  })

  it("respeta el límite por tienda", async () => {
    const feed = createEventFeed(3)
    const b = bus()
    feed.register(b)
    for (let i = 0; i < 5; i++) {
      await b.publish(sale())
    }
    expect(feed.recent("store-1")).toHaveLength(3)
  })
})

describe("conversation history listener", () => {
  it("indexa eventos de conversación", async () => {
    const history = createConversationEventHistory()
    const b = bus()
    history.register(b)
    await b.publish({
      type: "conversation.intent.detected",
      data: { conversationId: "c1", intent: "sales" },
      tenantId: "store-1",
      source: "test",
      actorId: "u1",
    })
    const records = history.listByConversation("c1")
    expect(records).toHaveLength(1)
    expect(records[0].intent).toBe("sales")
    expect(records[0].actorId).toBe("u1")
  })
})

describe("notifications listener", () => {
  it("envía notificaciones por los tipos por defecto", async () => {
    const sent: NotificationMessage[] = []
    const channel: NotificationChannel = { send: (n) => void sent.push(n) }
    const b = bus()
    registerNotificationsListener(b, { channel })
    await b.publish(sale())
    expect(sent).toHaveLength(1)
    expect(sent[0].title).toBe("Nueva venta")
  })

  it("no notifica eventos fuera del catálogo", async () => {
    const sent: NotificationMessage[] = []
    const channel: NotificationChannel = { send: (n) => void sent.push(n) }
    const b = bus()
    registerNotificationsListener(b, { channel })
    await b.publish({ type: "product.created", data: {}, tenantId: "store-1", source: "test" })
    expect(sent).toHaveLength(0)
  })

  it("respeta eventTypes personalizados", async () => {
    const sent: NotificationMessage[] = []
    const channel: NotificationChannel = { send: (n) => void sent.push(n) }
    const b = bus()
    registerNotificationsListener(b, { channel, eventTypes: new Set(["sale.created"]) })
    await b.publish({ type: "expense.created", data: { amount: 10 }, tenantId: "store-1", source: "test" })
    await b.publish(sale())
    expect(sent).toHaveLength(1)
    expect(sent[0].title).toBe("Nueva venta")
  })

  it("buildNotification devuelve null para tipos no notificables", () => {
    const event = {
      type: "product.created",
      data: { name: "X" },
      tenantId: "store-1",
      source: "test",
      id: "evt_1",
      occurredAt: new Date().toISOString(),
    }
    expect(buildNotification(event)).toBeNull()
  })
})

describe("business monitor listener", () => {
  it("refresca una vez por ventana de throttle por tienda", async () => {
    const refresh = vi.fn()
    const b = bus()
    registerBusinessMonitorListener(b, { refresh, throttleMs: 5_000 })
    await b.publish(sale("store-1"))
    await b.publish(sale("store-1"))
    await b.publish(sale("store-2"))
    expect(refresh).toHaveBeenCalledTimes(2)
    expect(refresh.mock.calls[0][0].tenantId).toBe("store-1")
    expect(refresh.mock.calls[1][0].tenantId).toBe("store-2")
  })

  it("ignora eventos que no cambian el estado del negocio", async () => {
    const refresh = vi.fn()
    const b = bus()
    registerBusinessMonitorListener(b, { refresh })
    await b.publish({ type: "appointment.created", data: {}, tenantId: "store-1", source: "test" })
    expect(refresh).not.toHaveBeenCalled()
  })

  it("no falla si el refresco lanza error", async () => {
    const refresh = vi.fn().mockRejectedValue(new Error("boom"))
    const b = bus()
    registerBusinessMonitorListener(b, { refresh, throttleMs: 0 })
    const report = await b.publish(sale())
    expect(report.ok).toBe(true)
  })
})

describe("recommendations listener", () => {
  it("genera recomendaciones y publica el resultado", async () => {
    const generate = vi.fn().mockResolvedValue([{ id: "r1" }, { id: "r2" }])
    const seen = vi.fn()
    const b = bus()
    b.subscribe("assistant.recommendation.created", seen)
    registerRecommendationsListener(b, { generate })
    await b.publish({
      type: "assistant.monitor.updated",
      data: {},
      tenantId: "store-1",
      source: "test",
      correlationId: "corr-1",
    })
    expect(generate).toHaveBeenCalledWith({
      tenantId: "store-1",
      actorId: undefined,
      correlationId: "corr-1",
    })
    expect(seen).toHaveBeenCalledTimes(1)
    const event = seen.mock.calls[0][0]
    expect(event.type).toBe("assistant.recommendation.created")
    expect(event.data.count).toBe(2)
    expect(event.correlationId).toBe("corr-1")
  })

  it("no hace nada sin generate", async () => {
    const b = bus()
    const report = await b.publish({ type: "assistant.monitor.updated", data: {}, tenantId: "store-1", source: "test" })
    expect(report.ok).toBe(true)
  })
})

describe("business memory listener", () => {
  it("aprende por repetición de cambios de precio", async () => {
    const engine = new BusinessMemoryEngine({ store: createInMemoryBusinessMemoryStore() })
    const b = bus()
    registerBusinessMemoryListener(b, { memory: engine })
    for (let i = 0; i < 2; i++) {
      await b.publish({
        type: "product.price.changed",
        data: { productId: "p1", name: "Manzana", oldPrice: 1, newPrice: 2 },
        tenantId: "store-1",
        source: "test",
        aggregateId: "p1",
      })
    }
    await flush()
    const ctx: MemoryContext = { userId: "system", storeId: "store-1", negocioId: undefined }
    const stats = await engine.stats(ctx)
    expect(stats.confirmed).toBe(1)
  })

  it("sin engine no hace nada", async () => {
    const b = bus()
    const report = await b.publish({
      type: "product.price.changed",
      data: { productId: "p1" },
      tenantId: "store-1",
      source: "test",
    })
    expect(report.ok).toBe(true)
  })
})
