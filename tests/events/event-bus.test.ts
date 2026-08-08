import { describe, expect, it, vi } from "vitest"
import { EventBus } from "@/lib/events"

function saleEvent(over: Record<string, unknown> = {}) {
  return {
    type: "sale.created",
    data: { total: 100, orderId: "o1" },
    tenantId: "store-1",
    source: "test",
    ...over,
  }
}

describe("EventBus", () => {
  it("publica y entrega el evento a los listeners", async () => {
    const bus = new EventBus()
    const listener = vi.fn()
    bus.subscribe("sale.created", listener)
    const report = await bus.publish(saleEvent())
    expect(listener).toHaveBeenCalledTimes(1)
    const event = listener.mock.calls[0][0]
    expect(event.type).toBe("sale.created")
    expect(event.tenantId).toBe("store-1")
    expect(event.id).toMatch(/^evt_/)
    expect(report.ok).toBe(true)
    expect(report.results).toHaveLength(1)
  })

  it("entrega a todos los listeners (incluido wildcard)", async () => {
    const bus = new EventBus()
    const a = vi.fn()
    const b = vi.fn()
    const wildcard = vi.fn()
    bus.subscribe("sale.created", a)
    bus.subscribe("sale.created", b)
    bus.subscribeAll(wildcard)
    await bus.publish(saleEvent())
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
    expect(wildcard).toHaveBeenCalledTimes(1)
  })

  it("respeta prioridad: mayor primero", async () => {
    const bus = new EventBus()
    const order: string[] = []
    bus.subscribe("sale.created", () => void order.push("low"), { priority: 0 })
    bus.subscribe("sale.created", () => void order.push("high"), { priority: 100 })
    bus.subscribe("sale.created", () => void order.push("mid"), { priority: 50 })
    await bus.publish(saleEvent())
    expect(order).toEqual(["high", "mid", "low"])
  })

  it("desuscribe listeners", async () => {
    const bus = new EventBus()
    const a = vi.fn()
    const off = bus.subscribe("sale.created", a)
    off()
    await bus.publish(saleEvent())
    expect(a).not.toHaveBeenCalled()
  })

  it("unsubscribe por id", async () => {
    const bus = new EventBus()
    const a = vi.fn()
    bus.subscribe("sale.created", a, { id: "custom-id" })
    expect(bus.unsubscribe("custom-id")).toBe(true)
    await bus.publish(saleEvent())
    expect(a).not.toHaveBeenCalled()
  })

  it("aísla errores: un listener que falla no detiene a los demás", async () => {
    const bus = new EventBus()
    const ok = vi.fn()
    bus.subscribe("sale.created", () => {
      throw new Error("boom")
    })
    bus.subscribe("sale.created", ok)
    const report = await bus.publish(saleEvent())
    expect(ok).toHaveBeenCalledTimes(1)
    expect(report.ok).toBe(false)
    expect(report.results[0].ok).toBe(false)
    expect(report.results[0].error).toContain("boom")
    expect(report.results[1].ok).toBe(true)
  })

  it("reintenta listeners que fallan y luego tienen éxito", async () => {
    const bus = new EventBus({ retryDelayMs: 1 })
    let attempts = 0
    bus.subscribe(
      "sale.created",
      () => {
        attempts++
        if (attempts < 3) throw new Error("transient")
      },
      { retries: 2 },
    )
    const report = await bus.publish(saleEvent())
    expect(attempts).toBe(3)
    expect(report.results[0].ok).toBe(true)
    expect(report.results[0].retries).toBe(2)
  })

  it("agota reintentos sin lanzar y reporta el fallo", async () => {
    const bus = new EventBus({ retryDelayMs: 1 })
    let attempts = 0
    bus.subscribe(
      "sale.created",
      () => {
        attempts++
        throw new Error("always")
      },
      { retries: 1 },
    )
    const report = await bus.publish(saleEvent())
    expect(attempts).toBe(2)
    expect(report.results[0].ok).toBe(false)
    expect(report.results[0].error).toContain("always")
  })

  it("middleware puede cortar el flujo (el evento no se despacha)", async () => {
    const bus = new EventBus()
    const listener = vi.fn()
    bus.subscribe("sale.created", listener)
    bus.use(async () => {
      // corta sin llamar a next()
    })
    const report = await bus.publish(saleEvent())
    expect(listener).not.toHaveBeenCalled()
    expect(report.ok).toBe(false)
    expect(report.rejected).toContain("middleware")
  })

  it("los middlewares corren en orden y terminan en el despacho", async () => {
    const bus = new EventBus()
    const order: string[] = []
    bus.use(async (_ctx, next) => {
      order.push("m1")
      await next()
    })
    bus.use(async (_ctx, next) => {
      order.push("m2")
      await next()
    })
    bus.subscribe("sale.created", () => void order.push("listener"))
    await bus.publish(saleEvent())
    expect(order).toEqual(["m1", "m2", "listener"])
  })

  it("ejecuta handlers onDispatched tras el despacho con el reporte", async () => {
    const bus = new EventBus()
    const handler = vi.fn()
    bus.onDispatched(handler)
    const report = await bus.publish(saleEvent())
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0][0]).toBe(report)
  })

  it("un handler onDispatched que falla no rompe la publicación", async () => {
    const bus = new EventBus()
    bus.onDispatched(() => {
      throw new Error("audit down")
    })
    const listener = vi.fn()
    bus.subscribe("sale.created", listener)
    const report = await bus.publish(saleEvent())
    expect(listener).toHaveBeenCalledTimes(1)
    expect(report.ok).toBe(true)
  })

  it("reporta estadísticas", async () => {
    const bus = new EventBus()
    bus.subscribe("sale.created", vi.fn())
    await bus.publish(saleEvent())
    const stats = bus.stats()
    expect(stats.published).toBe(1)
    expect(stats.delivered).toBe(1)
    expect(stats.listeners).toBe(1)
  })

  it("corta bucles infinitos por profundidad de reentrada", async () => {
    const bus = new EventBus({ maxReentrancy: 5, retryDelayMs: 0 })
    bus.subscribe("sale.created", (event) => bus.publish(saleEvent({ type: event.type })))
    await bus.publish(saleEvent())
    expect(bus.stats().published).toBe(5)
    expect(bus.stats().rejected).toBe(1)
  })

  it("clear elimina listeners, middlewares y handlers", async () => {
    const bus = new EventBus()
    const listener = vi.fn()
    bus.subscribe("sale.created", listener)
    bus.onDispatched(vi.fn())
    bus.use(async (_ctx, next) => void next())
    bus.clear()
    expect(bus.stats().listeners).toBe(0)
  })
})
