import { describe, expect, it, vi, beforeEach } from "vitest"
import { ConversationEngine } from "@/lib/conversation/engine"
import type { ConversationService } from "@/services/conversation.service"
import type { PanitasAgent } from "@/lib/agent-core"
import type { AgenticToolRunner } from "@/lib/agent-core"
import type { ConversationManager } from "@/lib/conversations"
import type { ConfirmationRequest } from "@/lib/agent-intel/types"

const ctx = { storeId: "store-1", userId: "user-1", role: "admin", plan: "business", storeName: "Mi Tienda" }
const NATIVE_CONFIRMATION_KEY = "__nativeConfirmation"

function makeConversations() {
  return {
    ensureConversation: vi.fn().mockResolvedValue({ id: "conv-1", title: "Nueva conversación", status: "active" }),
    saveMessage: vi.fn().mockResolvedValue({ id: "msg-x", role: "user", content: "hola", timestamp: "2026-01-01T00:00:00.000Z" }),
    getHistory: vi.fn().mockResolvedValue({ conversation: { id: "conv-1" }, messages: [] }),
  }
}

function makeAgent() {
  return {
    handle: vi.fn().mockResolvedValue({
      id: "resp-1",
      sessionId: "conv-1",
      userId: "user-1",
      storeId: "store-1",
      reply: "Respuesta determinista",
      taskType: "chat",
      provider: "openrouter",
      model: "model-x",
      toolCalls: [],
      ok: true,
      createdAt: "2026-01-01T00:00:00.000Z",
    }),
  }
}

function makeAgentic(overrides: Record<string, unknown> = {}) {
  return {
    run: vi.fn().mockResolvedValue({
      status: "completed",
      reply: "Venta registrada.",
      provider: "agentic",
      model: "nvidia-model",
      usage: { totalTokens: 12 },
      toolCalls: [{ name: "sales.create", input: {}, ok: true, output: "{}" }],
    }),
    ...overrides,
  }
}

function makeConversational(prepared?: Record<string, unknown>) {
  return {
    autoTitle: vi.fn().mockResolvedValue(undefined),
    prepareTurn: vi.fn().mockResolvedValue({
      conversationId: "conv-1",
      resolvedMessage: "hola",
      referenceResolved: false,
      topicChanged: false,
      context: { knownParams: {} },
      memory: "",
      ...prepared,
    }),
    completeTurn: vi.fn().mockResolvedValue(undefined),
  }
}

function build(input: {
  conversations?: ReturnType<typeof makeConversations>
  agent?: ReturnType<typeof makeAgent>
  agentic?: ReturnType<typeof makeAgentic>
  conversational?: ReturnType<typeof makeConversational>
} = {}) {
  const conversations = input.conversations ?? makeConversations()
  const agent = input.agent ?? makeAgent()
  const agentic = input.agentic ?? makeAgentic()
  const conversational = input.conversational ?? makeConversational()

  const engine = new ConversationEngine({
    conversations: conversations as unknown as ConversationService,
    agent: agent as unknown as PanitasAgent,
    agentic: agentic as unknown as AgenticToolRunner,
    conversational: conversational as unknown as ConversationManager,
  })
  return { engine, conversations, agent, agentic, conversational }
}

describe("ConversationEngine: integración FASE 3E (tool calling nativo)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("nativo completado: responde con la capa 3E sin delegar al agente LLM", async () => {
    const { engine, conversations, agent, agentic } = build()

    const result = await engine.chat(ctx, { message: "registra una venta" })

    expect(agentic.run).toHaveBeenCalled()
    expect(agent.handle).not.toHaveBeenCalled()
    expect(conversations.saveMessage).toHaveBeenCalledWith(
      ctx,
      "conv-1",
      expect.objectContaining({
        role: "assistant",
        content: "Venta registrada.",
        metadata: expect.objectContaining({ provider: "agentic", model: "nvidia-model", intent: "native.agentic" }),
      })
    )
    expect(result).toMatchObject({
      response: { reply: "Venta registrada.", provider: "agentic", ok: true },
      metadata: { status: "completed" },
    })
  })

  it("nativo confirmation_required: no ejecuta y persiste la confirmación pendiente", async () => {
    const confirmation: ConfirmationRequest = {
      actions: [
        {
          stepId: "native:inventory.updateStock:abc12345",
          tool: "inventory.updateStock",
          description: "Reducir el stock en 2 unidad(es)",
          impact: "La cantidad disponible del producto disminuirá.",
        },
      ],
      confirmCodes: ["confirm:native:inventory.updateStock:abc12345"],
      message: "Necesito tu confirmación antes de continuar",
      requestedAt: "2026-08-15T12:00:00.000Z",
    }
    const { engine, agent, agentic, conversational } = build({
      agentic: makeAgentic({
        run: vi.fn().mockResolvedValue({
          status: "confirmation_required",
          reply: confirmation.message,
          provider: "agentic",
          model: "m1",
          toolCalls: [],
          confirmation,
        }),
      }),
    })

    const result = await engine.chat(ctx, { message: "descuenta 2" })

    expect(agent.handle).not.toHaveBeenCalled()
    expect(result.metadata.status).toBe("confirmation_required")
    expect(result.confirmation).toEqual(confirmation)
    expect(conversational.completeTurn).toHaveBeenCalledWith(
      ctx,
      "conv-1",
      expect.objectContaining({
        actionId: "native",
        contextStatus: "awaiting_confirmation",
        knownParams: expect.objectContaining({
          [NATIVE_CONFIRMATION_KEY]: expect.stringContaining("requestedAt"),
        }),
      })
    )
  })

  it("nativo error: cae a las capas deterministas (agente 3A)", async () => {
    const { engine, agent, agentic } = build({
      agentic: makeAgentic({
        run: vi.fn().mockResolvedValue({
          status: "error",
          reply: "fallo",
          provider: "agentic",
          model: "m1",
          error: "provider down",
          toolCalls: [],
        }),
      }),
    })

    const result = await engine.chat(ctx, { message: "hola" })

    expect(agentic.run).toHaveBeenCalled()
    expect(agent.handle).toHaveBeenCalledWith(expect.objectContaining({ message: "hola" }))
    expect(result.response.reply).toBe("Respuesta determinista")
  })

  it("confirmación fresca (dentro del TTL) se reenvía a la segunda vuelta", async () => {
    const requestedAt = new Date().toISOString()
    const { engine, agentic, conversational } = build({
      conversational: makeConversational({
        context: { knownParams: { [NATIVE_CONFIRMATION_KEY]: JSON.stringify({ stepIds: ["native:x:1"], requestedAt }) } },
      }),
    })

    await engine.chat(ctx, { message: "sí", confirmedStepIds: ["native:x:1"] })

    expect(agentic.run).toHaveBeenCalledWith(
      expect.objectContaining({ confirmedStepIds: ["native:x:1"] })
    )
    expect(conversational.prepareTurn).toHaveBeenCalled()
  })

  it("confirmación expirada (fuera del TTL) NO se reenvía y se vuelve a pedir", async () => {
    const expired = new Date(Date.now() - 31 * 60 * 1000).toISOString()
    const { engine, agentic } = build({
      conversational: makeConversational({
        context: { knownParams: { [NATIVE_CONFIRMATION_KEY]: JSON.stringify({ stepIds: ["native:x:1"], requestedAt: expired }) } },
      }),
    })

    await engine.chat(ctx, { message: "sí", confirmedStepIds: ["native:x:1"] })

    expect(agentic.run).toHaveBeenCalledWith(
      expect.objectContaining({ confirmedStepIds: undefined })
    )
  })

  it("sin confirmación previa (sin clave) los ids llegan tal cual", async () => {
    const { engine, agentic } = build()
    await engine.chat(ctx, { message: "sí", confirmedStepIds: ["native:x:1"] })
    expect(agentic.run).toHaveBeenCalledWith(
      expect.objectContaining({ confirmedStepIds: ["native:x:1"] })
    )
  })

  it("sin dependencia agentic el turno se resuelve por las capas clásicas", async () => {
    const conversations = makeConversations()
    const agent = makeAgent()
    const engine = new ConversationEngine({
      conversations: conversations as unknown as ConversationService,
      agent: agent as unknown as PanitasAgent,
    })

    const result = await engine.chat(ctx, { message: "hola" })

    expect(agent.handle).toHaveBeenCalled()
    expect(result.metadata.status).toBe("completed")
  })
})
