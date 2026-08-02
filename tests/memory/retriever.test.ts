import { describe, expect, it } from "vitest"
import { MemoryRetriever, scoreItem, tokenize } from "@/lib/agent/memory"
import { createInMemoryMemoryStore, ctx, makeItem, otherStoreCtx } from "./helpers"

describe("MemoryRetriever (FASE 3D)", () => {
  it("tokeniza en español e ignora tokens cortos", () => {
    expect(tokenize("Ventas de la panadería hoy")).toContain("ventas")
    expect(tokenize("Ventas de la panadería hoy")).toContain("panadería")
    expect(tokenize("Ventas de la panadería hoy")).not.toContain("de")
    expect(tokenize("Ventas de la panadería hoy")).not.toContain("la")
  })

  it("scoring combina keyword, importancia, recencia y frecuencia", () => {
    const fresh = makeItem({ key: "producto:preferido", value: "panadería artesanal", importance: "HIGH", updatedAt: new Date().toISOString(), accessCount: 4 })
    const stale = makeItem({ key: "producto:viejo", value: "zapatos de cuero", importance: "LOW", updatedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(), accessCount: 0 })

    const freshScore = scoreItem("panadería artesanal", fresh, { keywordWeight: 0.45, importanceWeight: 0.25, recencyWeight: 0.2, frequencyWeight: 0.1, recencyHalfLifeDays: 30 })
    const staleScore = scoreItem("panadería artesanal", stale, { keywordWeight: 0.45, importanceWeight: 0.25, recencyWeight: 0.2, frequencyWeight: 0.1, recencyHalfLifeDays: 30 })

    expect(freshScore).toBeGreaterThan(staleScore)
  })

  it("recupera primero lo más relevante para la pregunta", async () => {
    const store = createInMemoryMemoryStore([
      makeItem({ key: "fact:negocio", value: "panadería artesanal en Caracas", importance: "HIGH" }),
      makeItem({ key: "pref:envio", value: "prefiere envíos en moto", importance: "MEDIUM" }),
      makeItem({ key: "pref:horario", value: "abre los domingos", importance: "LOW" }),
    ])
    const retriever = new MemoryRetriever(store)
    const results = await retriever.retrieve(ctx, "¿qué es tu negocio?", { limit: 8 })
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].item.key).toBe("fact:negocio")
  })

  it("aísla por negocio: no recupera memoria de otro store", async () => {
    const store = createInMemoryMemoryStore([
      makeItem({ key: "fact:secreto", value: "receta secreta del negocio A", storeId: "store-1" }),
      makeItem({ key: "fact:otro", value: "dato del negocio B", storeId: "store-2" }),
    ])
    const retriever = new MemoryRetriever(store)
    const results = await retriever.retrieve(ctx, "receta secreta", { limit: 8 })
    expect(results.every((r) => r.item.storeId === "store-1")).toBe(true)
    expect(results.some((r) => r.item.key === "fact:secreto")).toBe(true)
    expect(results.some((r) => r.item.key === "fact:otro")).toBe(false)

    const resultsOther = await retriever.retrieve(otherStoreCtx, "receta secreta", { limit: 8 })
    expect(resultsOther.every((r) => r.item.storeId === "store-2")).toBe(true)
  })

  it("filtra por importancia mínima", async () => {
    const store = createInMemoryMemoryStore([
      makeItem({ key: "a", value: "panadería", importance: "HIGH" }),
      makeItem({ key: "b", value: "panadería", importance: "LOW" }),
    ])
    const retriever = new MemoryRetriever(store)
    const results = await retriever.retrieve(ctx, "panadería", { limit: 8, minImportance: "MEDIUM" })
    expect(results.every((r) => ["MEDIUM", "HIGH", "CRITICAL"].includes(r.item.importance))).toBe(true)
  })

  it("aplica el límite", async () => {
    const store = createInMemoryMemoryStore([
      makeItem({ key: "a", value: "panadería", importance: "HIGH" }),
      makeItem({ key: "b", value: "panadería", importance: "HIGH" }),
      makeItem({ key: "c", value: "panadería", importance: "HIGH" }),
    ])
    const retriever = new MemoryRetriever(store, { limit: 2 })
    expect(await retriever.retrieve(ctx, "panadería")).toHaveLength(2)
  })
})
