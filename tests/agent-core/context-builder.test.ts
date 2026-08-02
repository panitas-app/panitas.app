import { describe, expect, it } from "vitest"
import { ContextBuilder } from "@/lib/agent-core/context-builder"
import type { AgentRequest, Message } from "@/lib/agent-core"

const request: AgentRequest = {
  userId: "u1",
  storeId: "s1",
  role: "admin",
  plan: "business_plus",
  permissions: ["report.read"],
  message: "¿cuánto vendí hoy?",
  metadata: { businessName: "Panitas Store" },
}

const history: Message[] = [
  { id: "m1", role: "user", content: "hola", timestamp: "t1" },
  { id: "m2", role: "assistant", content: "¿qué necesitas?", timestamp: "t2" },
]

describe("ContextBuilder", () => {
  it("construye system + historial + mensaje actual", () => {
    const builder = new ContextBuilder()
    const ctx = builder.buildBase({ request, sessionId: "sess-1", history })
    expect(ctx.sessionId).toBe("sess-1")
    expect(ctx.messages[0].role).toBe("system")
    expect(ctx.messages[0].content).toContain("Panitas")
    expect(ctx.messages).toHaveLength(4)
    expect(ctx.messages[1]).toEqual({ role: "user", content: "hola" })
    expect(ctx.messages[2]).toEqual({ role: "assistant", content: "¿qué necesitas?" })
    expect(ctx.messages[3]).toEqual({ role: "user", content: "¿cuánto vendí hoy?" })
  })

  it("incluye negocio y plan en el system prompt", () => {
    const builder = new ContextBuilder()
    const ctx = builder.buildBase({ request, sessionId: "s", history: [] })
    expect(ctx.messages[0].content).toContain("Panitas Store")
    expect(ctx.messages[0].content).toContain("business_plus")
  })

  it("lista las herramientas disponibles cuando se proveen", () => {
    const builder = new ContextBuilder({
      toolsProvider: () => [{ name: "report.today", description: "Ventas de hoy", permissions: ["report.read"] }],
    })
    const ctx = builder.buildBase({ request, sessionId: "s", history: [] })
    expect(ctx.messages[0].content).toContain("report.today")
    expect(ctx.messages[0].content).toContain("Ventas de hoy")
  })

  it("withToolResults inyecta los resultados en el system prompt sin duplicar historial", () => {
    const builder = new ContextBuilder()
    const base = builder.buildBase({ request, sessionId: "s", history })
    const enriched = builder.withToolResults(base, [
      { name: "report.today", input: {}, ok: true, output: '{"revenue":100}' },
    ])
    expect(enriched.messages).toHaveLength(4)
    expect(enriched.messages[0].content).toContain("report.today")
    expect(enriched.messages[0].content).toContain('{"revenue":100}')
    expect(enriched.toolResults).toHaveLength(1)
    expect(enriched.messages[1].content).toBe("hola")
  })
})
