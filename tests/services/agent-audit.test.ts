import { describe, expect, it, beforeEach } from "vitest"
import { AgentAuditService, InMemoryAgentAuditStore } from "@/lib/agent/audit"

function entry(overrides: Record<string, unknown> = {}) {
  return {
    userId: "u1",
    storeId: "s1",
    tool: "product.create",
    action: "product.create",
    result: "success" as const,
    ...overrides,
  }
}

describe("AgentAuditService", () => {
  let audit: AgentAuditService

  beforeEach(() => {
    audit = new AgentAuditService()
  })

  it("records a successful action with id and timestamp", () => {
    const recorded = audit.record(entry())
    expect(recorded.id).toBeTruthy()
    expect(recorded.timestamp).toBeInstanceOf(Date)
    expect(audit.list()).toHaveLength(1)
  })

  it("records errors and keeps the error message", () => {
    audit.record(entry({ tool: "order.create", result: "error", error: "Stock insuficiente" }))
    const list = audit.list()
    expect(list[0].result).toBe("error")
    expect(list[0].error).toBe("Stock insuficiente")
  })

  it("stores input payloads", () => {
    audit.record(entry({ input: { productId: "p1", qty: 5 } }))
    expect(audit.list()[0].input).toEqual({ productId: "p1", qty: 5 })
  })

  it("clears the store", () => {
    audit.record(entry())
    audit.clear()
    expect(audit.list()).toHaveLength(0)
  })

  it("supports a custom store", () => {
    const store = new InMemoryAgentAuditStore()
    const custom = new AgentAuditService(store)
    custom.record(entry())
    expect(store.list()).toHaveLength(1)
    expect(custom.list()).toHaveLength(1)
  })
})
