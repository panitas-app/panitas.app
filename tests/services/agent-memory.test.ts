import { describe, expect, it, vi, afterEach } from "vitest"
import { ShortTermMemory, agentMemory } from "@/lib/agent/memory/short-term-memory"

describe("ShortTermMemory", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("stores and retrieves values", () => {
    const mem = new ShortTermMemory()
    mem.set("last-query", "inventario")
    expect(mem.get("last-query")).toBe("inventario")
    expect(mem.keys()).toEqual(["last-query"])
  })

  it("returns null for missing keys", () => {
    const mem = new ShortTermMemory()
    expect(mem.get("nope")).toBeNull()
  })

  it("expires entries after TTL", () => {
    vi.useFakeTimers()
    const mem = new ShortTermMemory()
    mem.set("key", "value", 100)
    expect(mem.get("key")).toBe("value")
    vi.advanceTimersByTime(101)
    expect(mem.get("key")).toBeNull()
  })

  it("deletes and clears", () => {
    const mem = new ShortTermMemory()
    mem.set("a", "1")
    mem.set("b", "2")
    mem.delete("a")
    expect(mem.get("a")).toBeNull()
    mem.clear()
    expect(mem.keys()).toHaveLength(0)
  })

  it("exports a shared singleton", () => {
    expect(agentMemory).toBeInstanceOf(ShortTermMemory)
  })
})
