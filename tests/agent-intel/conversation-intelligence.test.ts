import { describe, expect, it, vi, beforeEach } from "vitest"
import { ConversationEngine } from "@/lib/conversation/engine"
import type { ConversationService } from "@/services/conversation.service"
import type { PanitasAgent } from "@/lib/agent-core"
import type { IntelligenceLayer } from "@/lib/agent-intel"
import type { IntelligenceResult } from "@/lib/agent-intel/types"

const ctx = { storeId: "store-1", userId: "user-1", role: "admin", plan: "business", storeName: "Mi Tienda" }

function makeConversations(overrides: Record<string, unknown> = {}) {
  return {
    ensureConversation: vi.fn().mockResolvedValue({ id: "conv-1", title: "Nueva conversación", status: "active" }),
    saveMessage: vi.fn().mockResolvedValue({ id: "msg-x", role: "assistant", content: "x", timestamp: "2026-01-01T00:00:00.000Z" }),
    getHistory: vi.fn().mockResolvedValue({ conversation: { id: "conv-1" }, messages: [] }),
    ...overrides,
  }
}

function makeAgent() {
  return {
    handle: vi.fn().mockResolvedValue({
      id: "resp-1",
      sessionId: "conv-1",
      userId: "user-1",
      storeId: "store-1",
      reply: "Respuesta del agente",
      taskType: "chat",
      provider: "openrouter",
      model: "model-x",
      usage: { totalTokens: 10 },
      toolCalls: [],
      ok: true,
      createdAt: "2026-01-01T00:00:00.000Z",
    }),
  }
}

const TRACE = {
  traceId: "t1",
  startedAt: "2026-01-01T00:00:00.000Z",
  intent: null,
  plan: null,
  steps: [],
  confirmationsRequested: 0,
  errors: [],
  events: [],
  totalMs: 0,
}

describe("ConversationEngine.chat con Intelligence Layer", () => {
  beforeEach(() => vi.clearAllMocks())

  function buildIntelligence(overrides: Partial<Record<string, unknown>> & { result: IntelligenceResult }) {
    return {
      run: vi.fn().mockResolvedValue(overrides.result),
    }
  }

  it("devuelve la solicitud de confirmación SIN llamar al agente", async () => {
    const conversations = makeConversations()
    const agent = makeAgent()
    const intelligence = buildIntelligence({
      result: {
        status: "confirmation_required",
        intent: { type: "accion", confidence: 0.9, domains: [], message: "x", entities: {}, destructive: true, needsTools: true, signals: [] },
        plan: null,
        confirmation: { actions: [{ stepId: "step-1", tool: "products.delete", description: "Eliminar", impact: "No recuperable" }], confirmCodes: ["confirm:step-1"], message: "Necesito tu confirmación.", requestedAt: "2026-01-01T00:00:00.000Z" },
        toolResults: [],
        reply: "Necesito tu confirmación.",
        trace: TRACE,
      },
    })
    const engine = new ConversationEngine({
      conversations: conversations as unknown as ConversationService,
      agent: agent as unknown as PanitasAgent,
      intelligence: intelligence as unknown as IntelligenceLayer,
    })

    const result = await engine.chat(ctx, { message: "elimina el producto" })

    expect(agent.handle).not.toHaveBeenCalled()
    expect(conversations.saveMessage).toHaveBeenCalledWith(
      ctx,
      "conv-1",
      expect.objectContaining({ role: "assistant", content: "Necesito tu confirmación." })
    )
    expect(result).toMatchObject({
      response: { provider: "intelligence", model: "confirmation", ok: true },
      metadata: { status: "confirmation_required", intent: "accion" },
      confirmation: {
        actions: [{ stepId: "step-1", tool: "products.delete", description: "Eliminar", impact: "No recuperable" }],
        confirmCodes: ["confirm:step-1"],
        message: "Necesito tu confirmación.",
      },
    })
  })

  it("reenvía confirmedStepIds a la capa de inteligencia en la segunda vuelta", async () => {
    const conversations = makeConversations()
    const agent = makeAgent()
    const intelligence = buildIntelligence({
      result: {
        status: "no_tools",
        intent: { type: "conversacion", confidence: 0.5, domains: [], message: "x", entities: {}, destructive: false, needsTools: false, signals: [] },
        plan: null,
        toolResults: [],
        trace: TRACE,
      },
    })
    const engine = new ConversationEngine({
      conversations: conversations as unknown as ConversationService,
      agent: agent as unknown as PanitasAgent,
      intelligence: intelligence as unknown as IntelligenceLayer,
    })

    await engine.chat(ctx, { message: "elimina el producto", confirmedStepIds: ["step-1"] })

    expect(intelligence.run).toHaveBeenCalledWith(expect.objectContaining({ confirmedStepIds: ["step-1"] }))
  })

  it("inyecta el contexto sintetizado al agente y persiste los toolCalls", async () => {
    const conversations = makeConversations()
    const agent = makeAgent()
    const intelligence = buildIntelligence({
      result: {
        status: "completed",
        intent: { type: "consulta", confidence: 0.8, domains: ["inventory"], message: "x", entities: {}, destructive: false, needsTools: true, signals: [] },
        plan: null,
        toolResults: [{ stepId: "step-1", tool: "inventory.searchProduct", status: "ok", output: { success: true, data: [{ name: "Abrazadera" }], error: null, metadata: {} }, durationMs: 5, attempts: 1 }],
        synthesizedContext: "INTENCION_DETECTADA: consulta\nRESULTADOS...",
        trace: TRACE,
      },
    })
    const engine = new ConversationEngine({
      conversations: conversations as unknown as ConversationService,
      agent: agent as unknown as PanitasAgent,
      intelligence: intelligence as unknown as IntelligenceLayer,
    })

    const result = await engine.chat(ctx, { message: "¿cuánto stock hay?" })

    expect(agent.handle).toHaveBeenCalledTimes(1)
    const agentRequest = agent.handle.mock.calls[0][0]
    expect(agentRequest.intelligenceContext).toContain("INTENCION_DETECTADA: consulta")
    expect(agentRequest.metadata.intelligence).toBe(true)

    const assistantSaves = conversations.saveMessage.mock.calls.filter(([, , payload]: [unknown, unknown, { role: string }]) => payload.role === "assistant")
    expect(assistantSaves).toHaveLength(1)
    expect(assistantSaves[0][2].toolCalls).toEqual([
      expect.objectContaining({ name: "inventory.searchProduct", ok: true }),
    ])
    expect(result.response.toolCalls).toHaveLength(1)
    expect(result.metadata).toMatchObject({ status: "completed", intent: "consulta" })
  })

  it("responde con fallback determinista sin llamar al agente cuando todo falla", async () => {
    const conversations = makeConversations()
    const agent = makeAgent()
    const intelligence = buildIntelligence({
      result: {
        status: "completed",
        intent: { type: "consulta", confidence: 0.8, domains: ["inventory"], message: "x", entities: {}, destructive: false, needsTools: true, signals: [] },
        plan: null,
        toolResults: [{ stepId: "step-1", tool: "inventory.searchProduct", status: "error", error: "timeout", durationMs: 5, attempts: 1 }],
        reply: "No pude completar la acción. inventory.searchProduct: timeout",
        trace: TRACE,
      },
    })
    const engine = new ConversationEngine({
      conversations: conversations as unknown as ConversationService,
      agent: agent as unknown as PanitasAgent,
      intelligence: intelligence as unknown as IntelligenceLayer,
    })

    const result = await engine.chat(ctx, { message: "¿cuánto stock hay?" })

    expect(agent.handle).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      response: { provider: "intelligence", model: "deterministic", ok: true, reply: expect.stringContaining("No pude completar") },
      metadata: { status: "completed" },
    })
  })

  it("en conversación sin tools delega directo al agente", async () => {
    const conversations = makeConversations()
    const agent = makeAgent()
    const intelligence = buildIntelligence({
      result: { status: "no_tools", intent: { type: "conversacion", confidence: 0.5, domains: [], message: "x", entities: {}, destructive: false, needsTools: false, signals: [] }, plan: null, toolResults: [], trace: TRACE },
    })
    const engine = new ConversationEngine({
      conversations: conversations as unknown as ConversationService,
      agent: agent as unknown as PanitasAgent,
      intelligence: intelligence as unknown as IntelligenceLayer,
    })

    const result = await engine.chat(ctx, { message: "hola" })

    expect(agent.handle).toHaveBeenCalledTimes(1)
    expect(result.response.ok).toBe(true)
  })
})
