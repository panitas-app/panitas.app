import { describe, expect, it, vi } from "vitest"
import {
  EventBus,
  ConsoleEventLogger,
  createEventLogger,
  correlationMiddleware,
  dedupeMiddleware,
  loggerMiddleware,
  tenantIsolationMiddleware,
  type EventLogger,
} from "@/lib/events"

function event(over: Record<string, unknown> = {}) {
  return { type: "sale.created", data: { total: 100 }, tenantId: "store-1", source: "test", ...over }
}

describe("middlewares del bus", () => {
  it("correlation: asigna correlationId cuando falta", async () => {
    const bus = new EventBus()
    bus.use(correlationMiddleware())
    const seen = vi.fn()
    bus.subscribe("sale.created", seen)
    await bus.publish(event({ correlationId: undefined }))
    const delivered = seen.mock.calls[0][0]
    expect(delivered.correlationId).toBeTruthy()
  })

  it("correlation: respeta un correlationId existente", async () => {
    const bus = new EventBus()
    bus.use(correlationMiddleware())
    const seen = vi.fn()
    bus.subscribe("sale.created", seen)
    await bus.publish(event({ correlationId: "corr-123" }))
    expect(seen.mock.calls[0][0].correlationId).toBe("corr-123")
  })

  it("tenant-isolation: corta eventos sin tenantId", async () => {
    const bus = new EventBus()
    bus.use(tenantIsolationMiddleware())
    const listener = vi.fn()
    bus.subscribe("sale.created", listener)
    const report = await bus.publish(event({ tenantId: "" }))
    expect(listener).not.toHaveBeenCalled()
    expect(report.ok).toBe(false)
    expect(report.rejected).toContain("middleware")
  })

  it("tenant-isolation: deja pasar eventos con tenantId", async () => {
    const bus = new EventBus()
    bus.use(tenantIsolationMiddleware())
    const listener = vi.fn()
    bus.subscribe("sale.created", listener)
    const report = await bus.publish(event())
    expect(listener).toHaveBeenCalledTimes(1)
    expect(report.ok).toBe(true)
  })

  it("dedupe: descarta duplicados dentro del TTL", async () => {
    const bus = new EventBus()
    bus.use(dedupeMiddleware({ ttlMs: 5_000 }))
    const listener = vi.fn()
    bus.subscribe("sale.created", listener)
    await bus.publish(event({ dedupeKey: "k1" }))
    await bus.publish(event({ dedupeKey: "k1" }))
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("dedupe: deja pasar tras expirar el TTL", async () => {
    const bus = new EventBus()
    bus.use(dedupeMiddleware({ ttlMs: 10 }))
    const listener = vi.fn()
    bus.subscribe("sale.created", listener)
    await bus.publish(event({ dedupeKey: "k2" }))
    await new Promise((r) => setTimeout(r, 20))
    await bus.publish(event({ dedupeKey: "k2" }))
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it("dedupe: no afecta eventos sin dedupeKey", async () => {
    const bus = new EventBus()
    bus.use(dedupeMiddleware())
    const listener = vi.fn()
    bus.subscribe("sale.created", listener)
    await bus.publish(event())
    await bus.publish(event())
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it("logger: registra entrada y salida del evento", async () => {
    const entries: Parameters<EventLogger["log"]>[0][] = []
    const logger: EventLogger = { log: (entry) => entries.push(entry) }
    const bus = new EventBus({ logger })
    bus.use(loggerMiddleware(logger))
    bus.subscribe("sale.created", vi.fn())
    await bus.publish(event())
    expect(entries.map((e) => e.message)).toContain("evento recibido")
    expect(entries.map((e) => e.message)).toContain("evento procesado")
  })
})

describe("loggers", () => {
  it("ConsoleEventLogger no lanza al loguear", () => {
    const logger = new ConsoleEventLogger()
    expect(() => logger.log({ level: "info", message: "hola", eventType: "sale.created" })).not.toThrow()
  })

  it("createEventLogger con noop no produce salida", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const logger = createEventLogger({ noop: true })
    logger.log({ level: "info", message: "silencioso" })
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
