import { describe, expect, it, vi, beforeEach } from "vitest"
import { ConversationEngine } from "@/lib/conversation/engine"
import type { ConversationService } from "@/services/conversation.service"
import type { PanitasAgent } from "@/lib/agent-core"

const ctx = { storeId: "store-1", userId: "user-1", role: "admin", plan: "business", storeName: "Mi Tienda" }

function makeConversations(overrides: Record<string, unknown> = {}) {
  return {
    ensureConversation: vi.fn().mockResolvedValue({ id: "conv-1", title: "Nueva conversación", status: "active" }),
    saveMessage: vi.fn().mockResolvedValue({ id: "msg-x", role: "user", content: "hola", timestamp: "2026-01-01T00:00:00.000Z" }),
    getHistory: vi.fn().mockResolvedValue({ conversation: { id: "conv-1" }, messages: [] }),
    ...overrides,
  }
}

function makeAgent(overrides: Record<string, unknown> = {}) {
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
    ...overrides,
  }
}

describe("ConversationEngine.chat", () => {
  beforeEach(() => vi.clearAllMocks())

  it("crea conversación, guarda mensajes y delega en el agente con el historial", async () => {
    const conversations = makeConversations()
    const agent = makeAgent()
    const engine = new ConversationEngine({
      conversations: conversations as unknown as ConversationService,
      agent: agent as unknown as PanitasAgent,
    })

    const result = await engine.chat(ctx, { message: "hola" })

    expect(conversations.ensureConversation).toHaveBeenCalledWith(ctx, undefined)
    expect(conversations.saveMessage).toHaveBeenCalledWith(
      ctx,
      "conv-1",
      expect.objectContaining({ role: "user", content: "hola" })
    )
    expect(agent.handle).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        storeId: "store-1",
        sessionId: "conv-1",
        message: "hola",
        role: "admin",
        history: [],
        metadata: expect.objectContaining({ businessName: "Mi Tienda", conversationId: "conv-1" }),
      })
    )
    // el agente recibe permisos de admin
    const agentRequest = agent.handle.mock.calls[0][0]
    expect(agentRequest.permissions).toContain("inventory.read")
    expect(agentRequest.permissions).toContain("order.cancel")

    expect(conversations.saveMessage).toHaveBeenCalledWith(
      ctx,
      "conv-1",
      expect.objectContaining({
        role: "assistant",
        content: "Respuesta del agente",
        toolCalls: [],
        metadata: expect.objectContaining({ provider: "openrouter", model: "model-x" }),
      })
    )
    expect(result).toMatchObject({
      conversationId: "conv-1",
      response: { reply: "Respuesta del agente", ok: true },
      metadata: { status: "completed" },
    })
  })

  it("reutiliza la conversación cuando viene conversationId", async () => {
    const conversations = makeConversations()
    const agent = makeAgent()
    const engine = new ConversationEngine({
      conversations: conversations as unknown as ConversationService,
      agent: agent as unknown as PanitasAgent,
    })

    await engine.chat(ctx, { conversationId: "conv-1", message: "hola" })
    expect(conversations.ensureConversation).toHaveBeenCalledWith(ctx, "conv-1")
  })

  it("limita el historial antes de enviarlo al agente", async () => {
    const longHistory = Array.from({ length: 60 }, (_, i) => ({
      id: `h${i}`,
      role: "user" as const,
      content: `mensaje ${i}`,
      timestamp: new Date(Date.now() - (60 - i) * 60_000).toISOString(),
    }))
    const conversations = makeConversations({ getHistory: vi.fn().mockResolvedValue({ conversation: { id: "conv-1" }, messages: longHistory }) })
    const agent = makeAgent()
    const engine = new ConversationEngine({
      conversations: conversations as unknown as ConversationService,
      agent: agent as unknown as PanitasAgent,
    })

    await engine.chat(ctx, { message: "hola" })
    const historySent = agent.handle.mock.calls[0][0].history
    expect(historySent.length).toBeLessThanOrEqual(30)
  })

  it("persiste la respuesta aunque el agente falle y devuelve ok:false", async () => {
    const conversations = makeConversations()
    const agent = makeAgent({
      handle: vi.fn().mockResolvedValue({
        id: "resp-err",
        sessionId: "conv-1",
        userId: "user-1",
        storeId: "store-1",
        reply: "Ocurrió un error al responder",
        taskType: "chat",
        provider: "openrouter",
        model: "model-x",
        toolCalls: [],
        ok: false,
        error: "provider timeout",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    })
    const engine = new ConversationEngine({
      conversations: conversations as unknown as ConversationService,
      agent: agent as unknown as PanitasAgent,
    })

    const result = await engine.chat(ctx, { message: "hola" })

    expect(conversations.saveMessage).toHaveBeenCalledWith(
      ctx,
      "conv-1",
      expect.objectContaining({ role: "assistant", content: "Ocurrió un error al responder" })
    )
    expect(result).toMatchObject({ response: { ok: false }, metadata: { status: "error" } })
  })
})
