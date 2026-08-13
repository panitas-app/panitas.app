/**
 * Tests del motor de Atención (FASE 8C).
 *
 * Cubren la conexión entre el bus de eventos y el re-sync de reglas: solo los
 * eventos que invalidan reglas disparan el listener, y el throttling por
 * tienda evita recalcular en cada request.
 */
import { describe, expect, it, vi, afterEach } from "vitest"
import { EventBus } from "@/lib/events/event-bus"
import {
  attentionTriggerEvents,
  registerAttentionListener,
  syncIfStale,
  resetAttentionSyncThrottle,
} from "@/lib/attention/engine"
import { makeFakeDb } from "./helpers"

afterEach(() => {
  resetAttentionSyncThrottle()
})

describe("attentionTriggerEvents (FASE 8C)", () => {
  it("deriva los triggers del catálogo de reglas", () => {
    const triggers = attentionTriggerEvents()
    expect(triggers.has("inventory.updated")).toBe(true)
    expect(triggers.has("credit.payment.created")).toBe(true)
    expect(triggers.has("conversation.message.created")).toBe(true)
    expect(triggers.size).toBeGreaterThan(10)
  })
})

describe("registerAttentionListener (FASE 8C)", () => {
  it("re-sincroniza solo en eventos que invalidan reglas", async () => {
    const bus = new EventBus()
    const sync = vi.fn().mockResolvedValue(undefined)
    registerAttentionListener(bus, { sync, throttleMs: 0 })

    await bus.publish({ type: "order.created", tenantId: "store-1", aggregateId: "o1" })
    await bus.publish({ type: "something.unrelated", tenantId: "store-1", aggregateId: "x" })
    await bus.publish({ type: "inventory.updated", tenantId: "store-1", aggregateId: "p1" })

    expect(sync).toHaveBeenCalledTimes(2)
    expect(sync).toHaveBeenCalledWith("store-1")
  })

  it("throttling por tienda: no recalcula en cada evento", async () => {
    const bus = new EventBus()
    const sync = vi.fn().mockResolvedValue(undefined)
    registerAttentionListener(bus, { sync, throttleMs: 30_000 })

    await bus.publish({ type: "inventory.updated", tenantId: "store-1", aggregateId: "p1" })
    await bus.publish({ type: "inventory.updated", tenantId: "store-1", aggregateId: "p2" })
    await bus.publish({ type: "inventory.updated", tenantId: "store-1", aggregateId: "p3" })

    expect(sync).toHaveBeenCalledTimes(1)
  })

  it("un error en el sync se traga pero no rompe el despacho del bus", async () => {
    const bus = new EventBus()
    const sync = vi.fn().mockRejectedValue(new Error("db down"))
    registerAttentionListener(bus, { sync, throttleMs: 0 })

    const report = await bus.publish({ type: "order.created", tenantId: "store-1", aggregateId: "o1" })
    // El listener atrapa el error internamente; el bus sigue OK.
    expect(report.ok).toBe(true)
    expect(sync).toHaveBeenCalledTimes(1)
  })
})

describe("syncIfStale (FASE 8C)", () => {
  it("devuelve null si la tienda ya se sincronizó hace poco", async () => {
    const db = makeFakeDb()
    const sync = vi.fn().mockResolvedValue({ created: 0 })
    const service = { sync } as never
    const first = await syncIfStale(service, "store-1", 10_000)
    expect(first).not.toBeNull()
    const second = await syncIfStale(service, "store-1", 10_000)
    expect(second).toBeNull()
    expect(sync).toHaveBeenCalledTimes(1)
  })
})

describe("integración con eventos de dominio (FASE 8C)", () => {
  it("el servicio enruta los eventos attention.item.* al bus (opcional)", async () => {
    // El sink onEvent de la app dispara eventos de dominio; este test verifica
    // que el engine no reacciona a los eventos que él mismo emite (evitar
    // bucles): "attention.item.created" no es un trigger de reglas.
    const triggers = attentionTriggerEvents()
    expect(triggers.has("attention.item.created")).toBe(false)
  })
})
