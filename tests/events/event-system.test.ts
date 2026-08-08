import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  EventBus,
  configureEventSystem,
  createEventSystem,
  getEventSystem,
  publishDomainEvent,
  resetEventSystemForTest,
} from "@/lib/events"

describe("createEventSystem", () => {
  it("audita, agrega analytics y mantiene el feed", async () => {
    const system = createEventSystem()
    const report = await system.publish({
      type: "sale.created",
      data: { total: 100 },
      tenantId: "store-1",
      source: "test",
      aggregateId: "o1",
      aggregateType: "Order",
      actorId: "u1",
    })
    expect(report.ok).toBe(true)
    expect(system.analytics.snapshot("store-1").orders.count).toBe(1)
    expect(system.dashboard.recent("store-1")).toHaveLength(1)
    expect(await system.history.count({ tenantId: "store-1" })).toBe(1)
    const rows = await system.history.list()
    expect(rows[0].result).toBe("ok")
    expect(rows[0].status).toBe("delivered")
    expect(rows[0].actorId).toBe("u1")
    system.close()
  })

  it("con enableListeners:false no registra listeners", async () => {
    const system = createEventSystem({ enableListeners: false })
    await system.publish({ type: "sale.created", data: {}, tenantId: "store-1", source: "test" })
    expect(system.stats().listeners).toBe(0)
    system.close()
  })

  it("corta eventos sin tenant (aislamiento por defecto)", async () => {
    const system = createEventSystem()
    const report = await system.publish({ type: "sale.created", data: {}, tenantId: "", source: "test" })
    expect(report.ok).toBe(false)
    expect(report.rejected).toContain("middleware")
    system.close()
  })

  it("multi-tenant: listeners aíslan por tienda", async () => {
    const system = createEventSystem()
    await system.publish({ type: "sale.created", data: { total: 100 }, tenantId: "store-1", source: "test" })
    await system.publish({ type: "sale.completed", data: { total: 100 }, tenantId: "store-1", source: "test" })
    await system.publish({ type: "sale.created", data: { total: 200 }, tenantId: "store-2", source: "test" })
    await system.publish({ type: "sale.completed", data: { total: 200 }, tenantId: "store-2", source: "test" })
    expect(system.analytics.snapshot("store-1").sales.revenue).toBe(100)
    expect(system.analytics.snapshot("store-2").sales.revenue).toBe(200)
    expect(system.dashboard.recent("store-1")).toHaveLength(2)
    expect(system.dashboard.recent("store-2")).toHaveLength(2)
    expect(system.dashboard.recent("store-1")[0].summary).toContain("Venta completada")
    expect(await system.history.count({ tenantId: "store-1" })).toBe(2)
    expect(await system.history.count({ tenantId: "store-2" })).toBe(2)
    system.close()
  })

  it("concurrencia: 50 publicaciones simultáneas no se pierden", async () => {
    const system = createEventSystem({ bus: new EventBus({ maxReentrancy: 100 }) })
    await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        system.publish({ type: "sale.created", data: { total: i }, tenantId: `store-${i % 2}`, source: "test" }),
      ),
    )
    expect(system.stats().published).toBe(50)
    expect(system.stats().rejected).toBe(0)
    expect(await system.history.count()).toBe(50)
    expect(system.analytics.snapshot("store-0").orders.count).toBe(25)
    system.close()
  })

  it("rendimiento: 500 publicaciones con todos los listeners < 3s", async () => {
    const system = createEventSystem()
    const start = Date.now()
    for (let i = 0; i < 500; i++) {
      await system.publish({ type: "sale.created", data: { total: i }, tenantId: "store-1", source: "test" })
    }
    const elapsed = Date.now() - start
    expect(system.stats().published).toBe(500)
    expect(elapsed).toBeLessThan(3_000)
    system.close()
  })

  it("fireAndForget publica en segundo plano", async () => {
    const system = createEventSystem()
    const before = system.stats().published
    system.fireAndForget({ type: "sale.created", data: {}, tenantId: "store-1", source: "test" })
    await new Promise((r) => setTimeout(r, 30))
    expect(system.stats().published).toBe(before + 1)
    system.close()
  })

  it("close libera listeners del bus", async () => {
    const system = createEventSystem()
    expect(system.stats().listeners).toBeGreaterThan(0)
    system.close()
    expect(system.stats().listeners).toBe(0)
  })
})

describe("singleton (getEventSystem)", () => {
  beforeEach(() => resetEventSystemForTest())
  afterEach(() => resetEventSystemForTest())

  it("publishDomainEvent usa el singleton", async () => {
    const report = await publishDomainEvent({ type: "sale.created", data: {}, tenantId: "store-1", source: "test" })
    expect(report.ok).toBe(true)
    expect(getEventSystem().stats().published).toBe(1)
  })

  it("configureEventSystem cierra el sistema anterior", async () => {
    const first = getEventSystem()
    const second = configureEventSystem()
    expect(second).not.toBe(first)
    expect(getEventSystem()).toBe(second)
  })

  it("resetEventSystemForTest deja el singleton limpio", async () => {
    getEventSystem()
    resetEventSystemForTest()
    const system = getEventSystem()
    expect(system.stats().published).toBe(0)
  })
})
