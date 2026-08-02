import { describe, expect, it, vi, beforeEach } from "vitest"
import { MemoryStorage } from "@/lib/agent/memory"
import { rowToItem } from "@/repositories/memory.repository"
import { ctx } from "./helpers"

const now = new Date()

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "mem-1",
    storeId: "store-1",
    userId: "user-1",
    negocioId: null,
    scope: "store",
    type: "long_term",
    kind: "fact",
    importance: "HIGH",
    key: "fact:negocio",
    value: JSON.stringify("panadería"),
    metadata: null,
    source: "user_message",
    expiresAt: null,
    lastAccessAt: null,
    accessCount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe("MemoryStorage (FASE 3D)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("delega get en el repositorio y convierte fila a MemoryItem", async () => {
    const repo = { findByKey: vi.fn().mockResolvedValue(makeRow()) }
    const storage = new MemoryStorage(repo as never)
    const item = await storage.get(ctx, "fact:negocio")
    expect(repo.findByKey).toHaveBeenCalledWith(expect.objectContaining({ storeId: "store-1" }), "fact:negocio")
    expect(item).toMatchObject({ key: "fact:negocio", value: "panadería", importance: "HIGH", storeId: "store-1" })
  })

  it("devuelve null cuando no existe", async () => {
    const repo = { findByKey: vi.fn().mockResolvedValue(null) }
    const storage = new MemoryStorage(repo as never)
    expect(await storage.get(ctx, "no-existe")).toBeNull()
  })

  it("serializa value no-string como JSON y scope por defecto store", async () => {
    const repo = {
      upsert: vi.fn().mockImplementation((_scope: unknown, input: { key: string; value: unknown }) =>
        Promise.resolve(makeRow({ key: input.key, value: JSON.stringify(input.value) }))
      ),
    }
    const storage = new MemoryStorage(repo as never)
    const item = await storage.set(ctx, { key: "settings:bolivares", value: { enabled: true } })
    expect(repo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: "store-1" }),
      expect.objectContaining({ key: "settings:bolivares" })
    )
    expect(item).toBeTruthy()
  })

  it("rowToItem parsea JSON y convierte fechas a ISO", () => {
    const item = rowToItem(makeRow() as never)
    expect(item.value).toBe("panadería")
    expect(item.createdAt).toBe(now.toISOString())
    expect(item.metadata).toBeUndefined()
    expect(item.expiresAt).toBeUndefined()
  })

  it("rowToItem mantiene raw cuando el value no es JSON", () => {
    const item = rowToItem(makeRow({ value: "texto plano" }) as never)
    expect(item.value).toBe("texto plano")
  })
})
