import { describe, expect, it } from "vitest"
import { ConversationSession } from "@/lib/conversations/conversation-session"
import { ConversationStorage } from "@/lib/conversations/conversation-storage"
import type { StoreServiceContext } from "@/services/context"
import type { Message } from "@/lib/agent-core/types"
import type { ConversationContextState, ConversationListItem, ConversationSummaryState } from "@/lib/conversations/conversation-types"

const USER: StoreServiceContext = { userId: "user-1", storeId: "store-1", negocioId: "neg-1" }

class MemoryStorage implements Pick<
  ConversationStorage,
  "ensureConversation" | "getConversation" | "list" | "getHistory" | "saveMessage" | "deleteConversation" | "rename" | "readContext" | "writeContext" | "readSummary" | "writeSummary" | "search"
> {
  conversations: Array<{ id: string; userId: string; storeId: string; title: string; status: string; createdAt: string; updatedAt: string; messageCount: number }> = []
  contextBy: Record<string, ConversationContextState> = {}
  summaryBy: Record<string, ConversationSummaryState> = {}
  private seq = 1

  async ensureConversation(ctx: StoreServiceContext, conversationId?: string) {
    if (conversationId) {
      const existing = this.conversations.find((c) => c.id === conversationId && c.userId === ctx.userId && c.storeId === ctx.storeId)
      if (!existing) throw new Error("Conversation not found")
      return existing
    }
    return this.create({ userId: ctx.userId, storeId: ctx.storeId })
  }

  async create(data: { userId: string; storeId: string; title?: string }) {
    const conversation = {
      id: `conv-${this.seq++}`,
      userId: data.userId,
      storeId: data.storeId,
      title: data.title || "Nueva conversación",
      status: "active",
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
      messageCount: 0,
    }
    this.conversations.push(conversation)
    return conversation
  }

  async getConversation(ctx: StoreServiceContext, id: string) {
    const conversation = this.conversations.find((c) => c.id === id && c.userId === ctx.userId && c.storeId === ctx.storeId)
    if (!conversation) throw new Error("Conversation not found")
    return conversation
  }

  async list(ctx: StoreServiceContext, opts: { skip?: number; take?: number; status?: string } = {}) {
    const rows = this.conversations
      .filter((c) => c.userId === ctx.userId && c.storeId === ctx.storeId && (!opts.status || c.status === opts.status))
      .slice(opts.skip ?? 0, (opts.skip ?? 0) + (opts.take ?? 50))
    return { conversations: rows, total: rows.length }
  }

  async getHistory() {
    return { messages: [] as Message[], hasMore: false }
  }

  async saveMessage(_ctx: StoreServiceContext, _id: string, _input: unknown) {
    void _ctx
    void _id
    void _input
  }

  async deleteConversation(ctx: StoreServiceContext, id: string) {
    this.conversations = this.conversations.filter((c) => !(c.id === id && c.userId === ctx.userId && c.storeId === ctx.storeId))
    delete this.contextBy[id]
    delete this.summaryBy[id]
  }

  async rename(ctx: StoreServiceContext, id: string, title: string) {
    const conversation = this.conversations.find((c) => c.id === id && c.userId === ctx.userId && c.storeId === ctx.storeId)
    if (!conversation) throw new Error("Conversation not found")
    conversation.title = title
    return conversation
  }

  async readContext(_ctx: StoreServiceContext, id: string) {
    return this.contextBy[id] ?? null
  }

  async writeContext(_ctx: StoreServiceContext, id: string, context: ConversationContextState) {
    this.contextBy[id] = context
  }

  async readSummary(_ctx: StoreServiceContext, id: string) {
    return this.summaryBy[id] ?? null
  }

  async writeSummary(_ctx: StoreServiceContext, id: string, summary: ConversationSummaryState) {
    this.summaryBy[id] = summary
  }

  async search(_ctx: StoreServiceContext, query: string, _opts?: unknown): Promise<{ conversations: ConversationListItem[]; total: number }> {
    void _ctx
    void _opts
    const q = query.toLowerCase()
    const rows = this.conversations.filter((c) => c.title.toLowerCase().includes(q))
    return { conversations: rows, total: rows.length }
  }
}

function makeSession() {
  const storage = new MemoryStorage()
  const session = new ConversationSession(storage as unknown as ConversationStorage)
  return { storage, session }
}

describe("ConversationSession", () => {
  it("crea una sesión nueva con contexto vacío y sin resumen", async () => {
    const { session, storage } = makeSession()
    const created = await session.create(USER)
    expect(created.conversationId).toBeTruthy()
    expect(created.title).toBe("Nueva conversación")
    expect(created.messageCount).toBe(0)
    expect(storage.conversations).toHaveLength(1)
  })

  it("crea dos sesiones distintas sin duplicar", async () => {
    const { session, storage } = makeSession()
    const first = await session.create(USER)
    const second = await session.create(USER)
    expect(second.conversationId).not.toBe(first.conversationId)
    expect(storage.conversations).toHaveLength(2)
  })

  it("recupera una sesión existente y restaura contexto y resumen", async () => {
    const { session, storage } = makeSession()
    const created = await session.create(USER)
    storage.writeContext(USER, created.conversationId, { domain: "inventario", activeEntity: { name: "Zapato" } } as ConversationContextState)
    storage.writeSummary(USER, created.conversationId, { keyFacts: ["hecho"], messageCount: 2 } as ConversationSummaryState)

    const restored = await session.restore(USER, created.conversationId)
    expect(restored.context).toEqual(expect.objectContaining({ domain: "inventario" }))
    expect(restored.summary?.keyFacts).toContain("hecho")
  })

  it("renombra una sesión", async () => {
    const { session, storage } = makeSession()
    const created = await session.create(USER)
    await session.rename(USER, created.conversationId, "Mis zapatos")
    expect(storage.conversations[0].title).toBe("Mis zapatos")
  })

  it("elimina una sesión y su contexto", async () => {
    const { session, storage } = makeSession()
    const created = await session.create(USER)
    storage.writeContext(USER, created.conversationId, { domain: "inventario" } as ConversationContextState)
    await session.delete(USER, created.conversationId)
    expect(storage.conversations).toHaveLength(0)
    expect(storage.contextBy[created.conversationId]).toBeUndefined()
  })

  it("lista solo las sesiones del mismo usuario/negocio", async () => {
    const { session } = makeSession()
    const a = await session.create(USER)
    const b = await session.create(USER)
    const sessions = await session.list(USER)
    expect(sessions.conversations.map((s) => s.id)).toEqual([a.conversationId, b.conversationId])
  })

  it("no expone contexto ni resumen al listar", async () => {
    const { session } = makeSession()
    await session.create(USER)
    const sessions = await session.list(USER)
    expect(Object.keys(sessions.conversations[0])).not.toContain("context")
    expect(Object.keys(sessions.conversations[0])).not.toContain("summary")
  })
})

describe("aislamiento por negocio (una tienda no ve otra)", () => {
  it("crea sesiones por negocio y no las mezcla", async () => {
    const { session } = makeSession()
    const storeA = { ...USER, storeId: "store-a" }
    const storeB = { ...USER, storeId: "store-b" }
    const createdA = await session.create(storeA)
    const createdB = await session.create(storeB)
    const listA = await session.list(storeA)
    const listB = await session.list(storeB)
    expect(listA.conversations.map((s) => s.id)).toEqual([createdA.conversationId])
    expect(listB.conversations.map((s) => s.id)).toEqual([createdB.conversationId])
  })

  it("un negocio no puede restaurar la sesión de otro", async () => {
    const { session } = makeSession()
    const storeA = { ...USER, storeId: "store-a" }
    const storeB = { ...USER, storeId: "store-b" }
    const createdA = await session.create(storeA)
    await expect(session.restore(storeB, createdA.conversationId)).rejects.toThrow(/not found/i)
  })
})
