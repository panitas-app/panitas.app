import { describe, expect, it, vi } from "vitest"
import { EventService } from "@/events/event.service"

describe("EventService", () => {
  it("registers an event and delivers the payload", () => {
    const bus = new EventService()
    const listener = vi.fn()
    bus.on("customer.created", listener)
    bus.emit("customer.created", { customerId: "c1", storeId: "s1", name: "Juan" })
    expect(listener).toHaveBeenCalledWith({ customerId: "c1", storeId: "s1", name: "Juan" })
  })

  it("supports unsubscribing", () => {
    const bus = new EventService()
    const listener = vi.fn()
    const off = bus.on("customer.created", listener)
    off()
    bus.emit("customer.created", { customerId: "c1", storeId: "s1", name: "Juan" })
    expect(listener).not.toHaveBeenCalled()
  })

  it("emits async events and awaits listeners", async () => {
    const bus = new EventService()
    const listener = vi.fn(async () => undefined)
    bus.on("order.created", listener)
    await bus.emitAsync("order.created", {
      orderId: "o1",
      storeId: "s1",
      orderNumber: "ORD-1001",
      total: 40,
      paymentStatus: "paid",
    })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("does not throw when a listener throws", () => {
    const bus = new EventService()
    bus.on("order.created", () => {
      throw new Error("boom")
    })
    expect(() =>
      bus.emit("order.created", {
        orderId: "o1",
        storeId: "s1",
        orderNumber: "ORD-1",
        total: 10,
        paymentStatus: "paid",
      })
    ).not.toThrow()
  })
})
