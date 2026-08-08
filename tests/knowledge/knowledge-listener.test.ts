/**
 * FASE 7D — Tests del listener de la Business Knowledge Base.
 *
 * Verifica que observa los eventos del dominio `knowledge`, mantiene estado
 * por tenant (created/updated/deleted/indexed/searches), ignora otros dominios
 * y dispara el hook `onEvent`.
 */
import { describe, expect, it } from "vitest"
import {
  EventBus,
  correlationMiddleware,
  tenantIsolationMiddleware,
  registerKnowledgeListener,
  type KnowledgeEventRecord,
} from "@/lib/events"

function bus() {
  const b = new EventBus()
  b.use(correlationMiddleware())
  b.use(tenantIsolationMiddleware())
  return b
}

function knowledgeEvent(type: string, tenantId = "store-1", extra: Record<string, unknown> = {}) {
  return {
    type,
    data: { domain: "knowledge", ...extra },
    tenantId,
    source: "test",
  }
}

describe("registerKnowledgeListener", () => {
  it("acumula contadores de documentos por tienda", async () => {
    const b = bus()
    const listener = registerKnowledgeListener(b)
    listener.register(b)

    await b.publish(knowledgeEvent("knowledge.document.created", "store-1", { documentId: "d1", title: "Política" }))
    await b.publish(knowledgeEvent("knowledge.document.indexed", "store-1", { documentId: "d1" }))
    await b.publish(knowledgeEvent("knowledge.document.updated", "store-1", { documentId: "d1" }))
    await b.publish(knowledgeEvent("knowledge.document.deleted", "store-1", { documentId: "d1" }))
    await b.publish(knowledgeEvent("knowledge.search.executed", "store-1", { query: "garantía", hits: 2 }))
    await b.publish(knowledgeEvent("knowledge.search.executed", "store-1", { query: "envío", hits: 0 }))

    const state = listener.get("store-1")
    expect(state).not.toBeNull()
    expect(state?.created).toBe(1)
    expect(state?.updated).toBe(1)
    expect(state?.deleted).toBe(1)
    expect(state?.indexed).toBe(1)
    expect(state?.searches).toBe(2)
    expect(state?.lastEvent).toBe("knowledge.search.executed")
  })

  it("aísla el estado por tenant", async () => {
    const b = bus()
    const listener = registerKnowledgeListener(b)
    listener.register(b)

    await b.publish(knowledgeEvent("knowledge.document.created", "store-1"))
    await b.publish(knowledgeEvent("knowledge.document.created", "store-2"))
    await b.publish(knowledgeEvent("knowledge.document.created", "store-2"))

    expect(listener.get("store-1")?.created).toBe(1)
    expect(listener.get("store-2")?.created).toBe(2)
    expect(listener.list()).toHaveLength(2)
  })

  it("ignora eventos de otros dominios", async () => {
    const b = bus()
    const listener = registerKnowledgeListener(b)
    listener.register(b)

    await b.publish({ type: "conversation.created", data: { domain: "conversations" }, tenantId: "store-1", source: "test" })
    await b.publish({ type: "knowledge.document.created", data: { domain: "otro" }, tenantId: "store-1", source: "test" })

    expect(listener.get("store-1")).toBeNull()
    expect(listener.list()).toHaveLength(0)
  })

  it("dispara el hook onEvent con el registro", async () => {
    const b = bus()
    const seen: KnowledgeEventRecord[] = []
    const listener = registerKnowledgeListener(b, { onEvent: (r) => seen.push(r) })
    listener.register(b)

    await b.publish(knowledgeEvent("knowledge.search.executed", "store-9", { query: "garantía", hits: 3 }))

    expect(seen).toHaveLength(1)
    expect(seen[0].tenantId).toBe("store-9")
    expect(seen[0].type).toBe("knowledge.search.executed")
    expect(seen[0].query).toBe("garantía")
    expect(seen[0].hits).toBe(3)
    expect(seen[0].occurredAt).toBeTypeOf("string")
  })

  it("permite limpiar el estado", async () => {
    const b = bus()
    const listener = registerKnowledgeListener(b)
    listener.register(b)
    await b.publish(knowledgeEvent("knowledge.document.created"))
    expect(listener.get("store-1")).not.toBeNull()
    listener.clear()
    expect(listener.get("store-1")).toBeNull()
  })

  it("el registro devuelve una función de desuscripción", async () => {
    const b = bus()
    const listener = registerKnowledgeListener(b)
    const off = listener.register(b)
    await b.publish(knowledgeEvent("knowledge.document.created"))
    expect(listener.get("store-1")?.created).toBe(1)
    off()
    await b.publish(knowledgeEvent("knowledge.document.created"))
    expect(listener.get("store-1")?.created).toBe(1)
  })
})
