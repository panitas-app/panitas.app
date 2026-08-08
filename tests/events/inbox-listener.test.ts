import { describe, expect, it } from "vitest"
import { EventBus, correlationMiddleware, tenantIsolationMiddleware, registerInboxListener, type InboxNotifyInput } from "@/lib/events"

function bus() {
  const b = new EventBus()
  b.use(correlationMiddleware())
  b.use(tenantIsolationMiddleware())
  return b
}

function inboxEvent(type: string, tenantId = "store-1", extra: Record<string, unknown> = {}) {
  return {
    type,
    data: { domain: "inbox", ...extra },
    aggregateId: "conv-1",
    tenantId,
    source: "inbox.conversation-service",
  }
}

describe("inbox listener (FASE 7A)", () => {
  it("notifica los eventos del dominio inbox", async () => {
    const notified: InboxNotifyInput[] = []
    const b = bus()
    registerInboxListener(b, { notify: (input) => void notified.push(input), throttleMs: 0 })
    await b.publish(inboxEvent("conversation.message.created"))
    expect(notified).toHaveLength(1)
    expect(notified[0]).toMatchObject({ tenantId: "store-1", conversationId: "conv-1", eventType: "conversation.message.created" })
  })

  it("ignora eventos con el mismo nombre pero de otro dominio (asistente FASE 3C)", async () => {
    const notified: InboxNotifyInput[] = []
    const b = bus()
    registerInboxListener(b, { notify: (input) => void notified.push(input), throttleMs: 0 })
    await b.publish({
      type: "conversation.message.created",
      data: { domain: "assistant", conversationId: "conv-agent" },
      aggregateId: "conv-agent",
      tenantId: "store-1",
      source: "agent",
    })
    expect(notified).toHaveLength(0)
  })

  it("ignora tipos de eventos ajenos al inbox", async () => {
    const notified: InboxNotifyInput[] = []
    const b = bus()
    registerInboxListener(b, { notify: (input) => void notified.push(input), throttleMs: 0 })
    await b.publish(inboxEvent("sale.created"))
    expect(notified).toHaveLength(0)
  })

  it("agrupa ráfagas con throttle por tienda", async () => {
    const notified: InboxNotifyInput[] = []
    const b = bus()
    registerInboxListener(b, { notify: (input) => void notified.push(input), throttleMs: 5_000 })
    await b.publish(inboxEvent("conversation.updated", "store-1"))
    await b.publish(inboxEvent("conversation.tagged", "store-1"))
    await b.publish(inboxEvent("conversation.assigned", "store-2"))
    expect(notified).toHaveLength(2)
    expect(notified.map((n) => n.tenantId).sort()).toEqual(["store-1", "store-2"])
  })

  it("no falla si el callback de notificación lanza", async () => {
    const b = bus()
    registerInboxListener(b, { notify: () => Promise.reject(new Error("boom")), throttleMs: 0 })
    const report = await b.publish(inboxEvent("conversation.completed"))
    expect(report.ok).toBe(true)
  })

  it("reconoce todos los tipos de eventos del inbox", async () => {
    const notified: InboxNotifyInput[] = []
    const b = bus()
    registerInboxListener(b, { notify: (input) => void notified.push(input), throttleMs: 0 })
    const types = [
      "conversation.created",
      "conversation.updated",
      "conversation.message.created",
      "conversation.assigned",
      "conversation.completed",
      "conversation.tagged",
    ]
    for (const type of types) await b.publish(inboxEvent(type))
    expect(notified).toHaveLength(types.length)
  })
})
