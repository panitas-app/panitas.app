import { describe, expect, it } from "vitest"
import { DefaultMemoryExtractor } from "@/lib/agent/memory"
import type { MemoryTurn } from "@/lib/agent/memory"

describe("DefaultMemoryExtractor (FASE 3D)", () => {
  const extractor = new DefaultMemoryExtractor()

  it("extrae candidatos del mensaje del usuario (clasificado)", async () => {
    const turn: MemoryTurn = {
      userId: "user-1",
      storeId: "store-1",
      message: "Mi negocio es una panadería artesanal en Caracas",
      reply: "¡Entendido! Tu negocio es una panadería artesanal.",
      toolCalls: [],
    }
    const candidates = await extractor.extract(turn)
    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates[0].kind).toBe("fact")
    expect(candidates[0].importance).toBe("HIGH")
    expect(candidates[0].source).toBe("user_message")
  })

  it("NO extrae nada de small talk", async () => {
    const turn: MemoryTurn = { userId: "user-1", storeId: "store-1", message: "Hola buenas", reply: "Hola" }
    expect(await extractor.extract(turn)).toHaveLength(0)
  })

  it("NO guarda la respuesta del asistente", async () => {
    const turn: MemoryTurn = {
      userId: "user-1",
      storeId: "store-1",
      message: "hola",
      reply: "Mi negocio es genial y vende mucho",
      toolCalls: [],
    }
    const candidates = await extractor.extract(turn)
    expect(candidates.every((c) => c.source !== "assistant")).toBe(true)
  })

  it("guarda resultados de tools de analytics como HIGH business", async () => {
    const turn: MemoryTurn = {
      userId: "user-1",
      storeId: "store-1",
      message: "cómo vamos en ventas",
      toolCalls: [{ name: "analytics.salesSummary", ok: true, output: "Ventas hoy: 250.00 USD (5 órdenes)" }],
    }
    const candidates = await extractor.extract(turn)
    const toolCandidate = candidates.find((c) => c.key === "analytics:salesSummary:latest")
    expect(toolCandidate).toBeTruthy()
    expect(toolCandidate!.kind).toBe("business_setting")
    expect(toolCandidate!.importance).toBe("HIGH")
    expect(toolCandidate!.type).toBe("business")
    expect(toolCandidate!.source).toBe("tool")
  })

  it("guarda resultados de inventario como MEDIUM product", async () => {
    const turn: MemoryTurn = {
      userId: "user-1",
      storeId: "store-1",
      message: "stock bajo",
      toolCalls: [{ name: "inventory.lowStock", ok: true, output: "3 productos bajo stock" }],
    }
    const candidates = await extractor.extract(turn)
    expect(candidates.find((c) => c.key === "inventory:lowStock:latest")?.importance).toBe("MEDIUM")
  })

  it("ignora tools fallidas y tools sin regla de memoria", async () => {
    const turn: MemoryTurn = {
      userId: "user-1",
      storeId: "store-1",
      message: "hola",
      toolCalls: [
        { name: "analytics.salesSummary", ok: false, output: "error" },
        { name: "orders.list", ok: true, output: "5 órdenes" },
      ],
    }
    expect(await extractor.extract(turn)).toHaveLength(0)
  })
})
