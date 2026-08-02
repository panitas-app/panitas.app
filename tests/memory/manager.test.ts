import { describe, expect, it, vi, beforeEach } from "vitest"
import { MemoryManager, MemoryClassifier } from "@/lib/agent/memory"
import { createInMemoryMemoryStore, ctx, makeItem, otherStoreCtx } from "./helpers"
import type { MemoryContext, MemoryItemInput, MemoryTurn } from "@/lib/agent/memory"

vi.mock("@/events/event.service", () => ({
  eventService: { emit: vi.fn() },
}))

vi.mock("@/lib/audit", () => ({
  createAuditEntry: vi.fn(() => ({ catch: vi.fn() })),
}))

import { eventService } from "@/events/event.service"

describe("MemoryManager (FASE 3D)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("remember guarda y upserta por storeId+key", async () => {
    const store = createInMemoryMemoryStore()
    const manager = new MemoryManager({ store })
    const input: MemoryItemInput = { key: "fact:negocio", value: "panadería", importance: "HIGH", type: "long_term", kind: "fact" }

    const created = await manager.remember(ctx, input)
    expect(created.importance).toBe("HIGH")
    expect(created.storeId).toBe("store-1")
    expect(eventService.emit).toHaveBeenCalledWith("memory.created", expect.objectContaining({ key: "fact:negocio", storeId: "store-1" }))

    const updated = await manager.remember(ctx, { ...input, value: "panadería 2.0" })
    expect(updated.value).toBe("panadería 2.0")
    expect(await store.count(ctx)).toBe(1)
    expect(eventService.emit).toHaveBeenCalledWith("memory.updated", expect.objectContaining({ key: "fact:negocio" }))
  })

  it("remember clasifica automáticamente cuando falta importancia", async () => {
    const store = createInMemoryMemoryStore()
    const manager = new MemoryManager({ store, classifier: new MemoryClassifier() })
    const item = await manager.remember(ctx, { key: "pref:envio", value: "Prefiero cobrar en bolívares", source: "user_message" })
    expect(item.importance).toBe("HIGH")
    expect(item.kind).toBe("preference")
    expect(item.type).toBe("long_term")
  })

  it("aisla memoria por negocio en remember", async () => {
    const store = createInMemoryMemoryStore()
    const manager = new MemoryManager({ store })
    await manager.remember(ctx, { key: "fact:negocio", value: "panadería" })
    await manager.remember(otherStoreCtx, { key: "fact:negocio", value: "zapatería" })

    expect((await manager.recall(ctx, "fact:negocio"))!.value).toBe("panadería")
    expect((await manager.recall(otherStoreCtx, "fact:negocio"))!.value).toBe("zapatería")
  })

  it("forget elimina y emite evento", async () => {
    const store = createInMemoryMemoryStore([makeItem({ key: "fact:negocio", value: "panadería" })])
    const manager = new MemoryManager({ store })

    expect(await manager.forget(ctx, "fact:negocio")).toBe(true)
    expect(await manager.forget(ctx, "no-existe")).toBe(false)
    expect(eventService.emit).toHaveBeenCalledWith("memory.deleted", expect.objectContaining({ key: "fact:negocio" }))
  })

  it("saveTurn extrae y guarda el turno (best-effort)", async () => {
    const store = createInMemoryMemoryStore()
    const manager = new MemoryManager({ store })
    const turn: MemoryTurn = {
      userId: "user-1",
      storeId: "store-1",
      message: "Mi negocio es una panadería artesanal",
      reply: "Entendido",
      toolCalls: [{ name: "analytics.salesSummary", ok: true, output: "Ventas: 100 USD" }],
    }
    const saved = await manager.saveTurn(ctx, turn)
    expect(saved.length).toBeGreaterThan(0)
    const keys = saved.map((i) => i.key)
    expect(keys).toContain("analytics:salesSummary:latest")
  })

  it("saveTurn nunca lanza aunque el extractor falle", async () => {
    const store = createInMemoryMemoryStore()
    const failingExtractor = { extract: vi.fn().mockRejectedValue(new Error("boom")) }
    const manager = new MemoryManager({ store, extractor: failingExtractor as never })
    const turn: MemoryTurn = { userId: "user-1", storeId: "store-1", message: "hola" }
    const saved = await manager.saveTurn(ctx, turn)
    expect(saved).toEqual([])
  })

  it("buildMemoryContext formatea memoria recuperada con límite de tamaño", async () => {
    const store = createInMemoryMemoryStore([
      makeItem({ key: "fact:negocio", value: "panadería artesanal", importance: "HIGH" }),
    ])
    const manager = new MemoryManager({ store })
    const text = await manager.buildMemoryContext(ctx, "qué es tu negocio")
    expect(text).toContain("Memoria relevante del negocio")
    expect(text).toContain("panadería artesanal")
    expect(text).toContain("HIGH")
  })

  it("buildMemoryContext devuelve vacío si no hay hits", async () => {
    const store = createInMemoryMemoryStore()
    const manager = new MemoryManager({ store })
    expect(await manager.buildMemoryContext(ctx, "xyz")).toBe("")
  })

  it("clean delega en el cleaner", async () => {
    const store = createInMemoryMemoryStore([
      makeItem({ key: "expirado", expiresAt: new Date(Date.now() - 1000).toISOString() }),
      makeItem({ key: "vigente" }),
    ])
    const manager = new MemoryManager({ store })
    const result = await manager.clean(ctx)
    expect(result.expired).toBe(1)
    expect(result.capped.removed).toBe(0)
  })

  it("MemoryContext admite negocioId opcional", () => {
    const c: MemoryContext = { userId: "u", storeId: "s", negocioId: undefined }
    expect(c.storeId).toBe("s")
  })
})
