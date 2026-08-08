import { describe, expect, it } from "vitest"
import { EventBus, registerCommunicationListener, type CommunicationEventRecord } from "@/lib/events"

function bus() {
  return new EventBus()
}

function communicationEvent(type: string, tenantId = "store-1", extra: Record<string, unknown> = {}) {
  return {
    type,
    data: { domain: "communication", ...extra },
    aggregateId: extra.providerId ?? "mock-whatsapp",
    tenantId,
    source: "communication.provider-manager",
  }
}

describe("communication listener (FASE 7C)", () => {
  it("mantiene estado y contadores por proveedor", async () => {
    const b = bus()
    const listener = registerCommunicationListener(b)
    await b.publish(communicationEvent("channel.connected", "store-1", { providerId: "mock-whatsapp", channel: "whatsapp" }))
    await b.publish(communicationEvent("message.sent", "store-1", { providerId: "mock-whatsapp", channel: "whatsapp", messageId: "m1" }))
    await b.publish(communicationEvent("message.received", "store-1", { providerId: "mock-whatsapp", channel: "whatsapp", messageId: "m2" }))
    await b.publish(communicationEvent("provider.retry", "store-1", { providerId: "mock-whatsapp", channel: "whatsapp", attempts: 2 }))

    const state = listener.get("mock-whatsapp")
    expect(state).toMatchObject({
      providerId: "mock-whatsapp",
      tenantId: "store-1",
      channel: "whatsapp",
      sent: 1,
      received: 1,
      retries: 1,
    })
    expect(state?.lastEvent).toBe("provider.retry")
  })

  it("cuenta errores y aísla por proveedor", async () => {
    const b = bus()
    const listener = registerCommunicationListener(b)
    await b.publish(communicationEvent("provider.error", "store-1", { providerId: "mock-whatsapp", channel: "whatsapp", error: "boom" }))
    await b.publish(communicationEvent("provider.error", "store-1", { providerId: "mock-email", channel: "email", error: "boom" }))

    expect(listener.get("mock-whatsapp")?.errors).toBe(1)
    expect(listener.get("mock-email")?.errors).toBe(1)
    expect(listener.list()).toHaveLength(2)
  })

  it("ignora eventos sin dominio communication", async () => {
    const b = bus()
    const listener = registerCommunicationListener(b)
    await b.publish({
      type: "message.sent",
      data: { providerId: "mock-whatsapp", channel: "whatsapp" },
      tenantId: "store-1",
      source: "otro-modulo",
    })
    expect(listener.list()).toHaveLength(0)
  })

  it("ignora tipos ajenos a la capa de comunicación", async () => {
    const b = bus()
    const listener = registerCommunicationListener(b)
    await b.publish({ type: "sale.created", data: {}, tenantId: "store-1", source: "sales" })
    expect(listener.list()).toHaveLength(0)
  })

  it("invoca el hook onEvent por cada evento válido", async () => {
    const records: CommunicationEventRecord[] = []
    const b = bus()
    registerCommunicationListener(b, { onEvent: (r) => records.push(r) })
    await b.publish(communicationEvent("channel.connected", "store-1", { providerId: "mock-whatsapp", channel: "whatsapp" }))
    await b.publish(communicationEvent("channel.disconnected", "store-1", { providerId: "mock-whatsapp", channel: "whatsapp" }))
    expect(records).toHaveLength(2)
    expect(records[0]).toMatchObject({ type: "channel.connected", providerId: "mock-whatsapp", tenantId: "store-1" })
  })

  it("clear reinicia el estado", async () => {
    const b = bus()
    const listener = registerCommunicationListener(b)
    await b.publish(communicationEvent("channel.connected"))
    listener.clear()
    expect(listener.list()).toHaveLength(0)
  })
})
