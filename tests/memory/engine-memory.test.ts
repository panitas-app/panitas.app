import { describe, expect, it, vi, beforeEach } from "vitest"
import { ConversationEngine } from "@/lib/conversation/engine"
import type { ConversationService } from "@/services/conversation.service"
import type { PanitasAgent } from "@/lib/agent-core"
import type { MemoryManager } from "@/lib/agent/memory"
import type { BusinessContextBuilder } from "@/lib/agent/context"

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
      toolCalls: [{ name: "analytics.salesSummary", ok: true, output: "Ventas hoy: 100 USD", input: {} }],
      ok: true,
      createdAt: "2026-01-01T00:00:00.000Z",
    }),
    ...overrides,
  }
}

describe("ConversationEngine + memoria (FASE 3D)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("inyecta businessContext y memoryContext en el request del agente cuando hay context builder", async () => {
    const conversations = makeConversations()
    const agent = makeAgent()
    const context = {
      build: vi.fn().mockResolvedValue({
        business: { id: "store-1", name: "Mi Tienda", slug: "mi-tienda", description: "Panadería", country: "VE", category: "tienda" },
        user: { id: "user-1", name: null, email: null, role: "admin" },
        plan: { plan: "business", planStatus: "activo", modalidad: "tienda" },
        permissions: [],
        metrics: null,
        profile: null,
        memory: [{ key: "fact:negocio", importance: "HIGH", value: "panadería artesanal" }],
        builtAt: "2026-01-01T00:00:00.000Z",
      }),
      toBusinessFragment: vi.fn().mockReturnValue("Negocio: Mi Tienda (tienda)."),
      toMemoryFragment: vi.fn().mockReturnValue("Memoria relevante del negocio:\n- [HIGH] panadería artesanal"),
    }
    const engine = new ConversationEngine({
      conversations: conversations as unknown as ConversationService,
      agent: agent as unknown as PanitasAgent,
      context: context as unknown as BusinessContextBuilder,
    })

    await engine.chat(ctx, { message: "¿qué es tu negocio?" })

    const request = agent.handle.mock.calls[0][0]
    expect(request.businessContext).toContain("Mi Tienda")
    expect(request.memoryContext).toContain("panadería artesanal")
    expect(context.build).toHaveBeenCalledWith(expect.objectContaining({ storeId: "store-1" }), "¿qué es tu negocio?")
  })

  it("sin context builder, usa buildMemoryContext del MemoryManager", async () => {
    const conversations = makeConversations()
    const agent = makeAgent()
    const memory = {
      buildMemoryContext: vi.fn().mockResolvedValue("Memoria relevante del negocio:\n- [HIGH] panadería artesanal"),
      saveTurn: vi.fn().mockResolvedValue([]),
    }
    const engine = new ConversationEngine({
      conversations: conversations as unknown as ConversationService,
      agent: agent as unknown as PanitasAgent,
      memory: memory as unknown as MemoryManager,
    })

    await engine.chat(ctx, { message: "¿qué es tu negocio?" })

    const request = agent.handle.mock.calls[0][0]
    expect(request.memoryContext).toContain("panadería artesanal")
    expect(request.businessContext).toBeUndefined()
    expect(memory.buildMemoryContext).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: "store-1", userId: "user-1" }),
      "¿qué es tu negocio?"
    )
  })

  it("guarda el turno en memoria tras responder (best-effort, sin bloquear)", async () => {
    const conversations = makeConversations()
    const agent = makeAgent()
    const memory = {
      buildMemoryContext: vi.fn().mockResolvedValue(""),
      saveTurn: vi.fn().mockResolvedValue([]),
    }
    const engine = new ConversationEngine({
      conversations: conversations as unknown as ConversationService,
      agent: agent as unknown as PanitasAgent,
      memory: memory as unknown as MemoryManager,
    })

    await engine.chat(ctx, { message: "mi negocio es una panadería" })

    expect(memory.saveTurn).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: "store-1", userId: "user-1" }),
      expect.objectContaining({
        message: "mi negocio es una panadería",
        reply: "Respuesta del agente",
        toolCalls: [expect.objectContaining({ name: "analytics.salesSummary" })],
      })
    )
  })

  it("no rompe el chat si la memoria falla", async () => {
    const conversations = makeConversations()
    const agent = makeAgent()
    const memory = {
      buildMemoryContext: vi.fn().mockRejectedValue(new Error("bd caída")),
      saveTurn: vi.fn().mockRejectedValue(new Error("bd caída")),
    }
    const engine = new ConversationEngine({
      conversations: conversations as unknown as ConversationService,
      agent: agent as unknown as PanitasAgent,
      memory: memory as unknown as MemoryManager,
    })

    const result = await engine.chat(ctx, { message: "hola" })
    expect(result.response.ok).toBe(true)
    expect(conversations.saveMessage).toHaveBeenCalledTimes(2)
  })
})
