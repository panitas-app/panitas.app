import { afterEach, describe, expect, it, vi } from "vitest"
import { EventBus } from "@/lib/events"
import { registerLegacyBridge } from "@/lib/events/legacy-bridge"
import { eventService } from "@/events/event.service"

const flush = () => new Promise((r) => setTimeout(r, 15))

describe("legacy bridge (eventService → bus 5H)", () => {
  afterEach(() => {
    eventService.clear()
  })

  it("republica un evento legacy en el bus con tenantId y aggregateId", async () => {
    const bus = new EventBus()
    const listener = vi.fn()
    bus.subscribe("sale.created", listener)
    const off = registerLegacyBridge(bus)

    eventService.emit("sale.created", { orderId: "o1", storeId: "store-1", total: 50, orderNumber: "ORD-1" })
    await flush()

    expect(listener).toHaveBeenCalledTimes(1)
    const event = listener.mock.calls[0][0]
    expect(event.type).toBe("sale.created")
    expect(event.tenantId).toBe("store-1")
    expect(event.aggregateId).toBe("o1")
    expect(event.source).toBe("legacy:event.service")
    expect(event.metadata.legacy).toBe(true)
    off()
  })

  it("deriva tenantId de negocioId (agenda)", async () => {
    const bus = new EventBus()
    const listener = vi.fn()
    bus.subscribe("appointment.created", listener)
    const off = registerLegacyBridge(bus)

    eventService.emit("appointment.created", { appointmentId: "a1", negocioId: "neg-1", date: new Date(), time: "10:00" })
    await flush()

    const event = listener.mock.calls[0][0]
    expect(event.tenantId).toBe("neg-1")
    expect(event.aggregateId).toBe("a1")
    off()
  })

  it("no publica eventos sin storeId ni negocioId", async () => {
    const bus = new EventBus()
    const listener = vi.fn()
    bus.subscribe("sale.created", listener)
    const off = registerLegacyBridge(bus)

    eventService.emit("sale.created", { orderId: "o1", storeId: "", total: 50, orderNumber: "ORD-1" })
    await flush()

    expect(listener).not.toHaveBeenCalled()
    off()
  })

  it("off() desregistra el puente", async () => {
    const bus = new EventBus()
    const listener = vi.fn()
    bus.subscribe("sale.created", listener)
    const off = registerLegacyBridge(bus)
    off()

    eventService.emit("sale.created", { orderId: "o1", storeId: "store-1", total: 50, orderNumber: "ORD-1" })
    await flush()

    expect(listener).not.toHaveBeenCalled()
  })
})
