import { describe, expect, it, vi } from "vitest"
import { EventBus, correlationMiddleware, tenantIsolationMiddleware, registerFinancialListener } from "@/lib/events"

function bus() {
  const b = new EventBus()
  b.use(correlationMiddleware())
  b.use(tenantIsolationMiddleware())
  return b
}

function finEvent(type: string, tenantId = "store-1") {
  return { type, data: {}, tenantId, source: "test" }
}

describe("financial listener (FASE 6D)", () => {
  it("invalida la caché por los eventos que cambian las finanzas", async () => {
    const invalidate = vi.fn()
    const b = bus()
    registerFinancialListener(b, { invalidate, throttleMs: 0 })
    await b.publish(finEvent("expense.created", "store-1"))
    await b.publish(finEvent("credit.payment.created", "store-1"))
    await b.publish(finEvent("supplier.payment.created", "store-1"))
    expect(invalidate).toHaveBeenCalledTimes(3)
    expect(invalidate).toHaveBeenCalledWith("store-1")
  })

  it("no invalida para eventos fuera de finanzas", async () => {
    const invalidate = vi.fn()
    const b = bus()
    registerFinancialListener(b, { invalidate })
    await b.publish(finEvent("product.created"))
    await b.publish(finEvent("appointment.created"))
    expect(invalidate).not.toHaveBeenCalled()
  })

  it("agrupa ráfagas con throttle por tienda", async () => {
    const invalidate = vi.fn()
    const b = bus()
    registerFinancialListener(b, { invalidate, throttleMs: 5_000 })
    await b.publish(finEvent("sale.created", "store-1"))
    await b.publish(finEvent("sale.updated", "store-1"))
    await b.publish(finEvent("expense.created", "store-2"))
    expect(invalidate).toHaveBeenCalledTimes(2)
    expect(invalidate.mock.calls[0][0]).toBe("store-1")
    expect(invalidate.mock.calls[1][0]).toBe("store-2")
  })

  it("invalida por defecto la caché compartida del motor", async () => {
    const b = bus()
    registerFinancialListener(b)
    const report = await b.publish(finEvent("sale.completed", "store-1"))
    expect(report.ok).toBe(true)
  })

  it("no falla si la invalidación lanza error", async () => {
    const invalidate = vi.fn().mockRejectedValue(new Error("boom"))
    const b = bus()
    registerFinancialListener(b, { invalidate, throttleMs: 0 })
    const report = await b.publish(finEvent("expense.created"))
    expect(report.ok).toBe(true)
  })

  it("reconoce todos los tipos de eventos financieros", async () => {
    const invalidate = vi.fn()
    const b = bus()
    registerFinancialListener(b, { invalidate, throttleMs: 0 })
    const types = [
      "sale.created",
      "sale.updated",
      "sale.deleted",
      "sale.completed",
      "sale.cancelled",
      "order.created",
      "order.updated",
      "order.completed",
      "order.cancelled",
      "expense.created",
      "expense.updated",
      "expense.deleted",
      "credit.payment.created",
      "credit.completed",
      "credit.updated",
      "supplier.payment.created",
      "supplier.payment.partial",
      "supplier.invoice.created",
      "supplier.purchase.created",
      "supplier.balance.updated",
    ]
    for (const type of types) await b.publish(finEvent(type))
    expect(invalidate).toHaveBeenCalledTimes(types.length)
  })
})
