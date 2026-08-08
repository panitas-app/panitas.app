import { describe, expect, it } from "vitest"
import { ConversationManager, generateTitle } from "@/lib/conversations/conversation-manager"
import { ConversationStorage } from "@/lib/conversations/conversation-storage"
import type { StoreServiceContext } from "@/services/context"
import type { Message } from "@/lib/agent-core/types"
import type { ConversationContextState, ConversationListItem, ConversationSummaryState } from "@/lib/conversations/conversation-types"
import { createInitialContext } from "@/lib/conversations/conversation-context"

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

  async saveMessage() {}

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

function makeManager() {
  const storage = new MemoryStorage()
  const manager = new ConversationManager({ storage: storage as unknown as ConversationStorage })
  return { storage, manager }
}

describe("generateTitle", () => {
  it("usa las primeras palabras del mensaje y capitaliza", () => {
    expect(generateTitle("crea un producto nuevo para la tienda por favor")).toBe("Crea un producto nuevo para la…")
  })

  it("trunca por caracteres", () => {
    const title = generateTitle("a".repeat(50))
    expect(title.length).toBeLessThanOrEqual(41)
    expect(title.endsWith("…")).toBe(true)
  })

  it("devuelve vacío si el mensaje está vacío", () => {
    expect(generateTitle("")).toBe("")
  })
})

describe("ConversationManager", () => {
  it("prepara un turno con referencia contextual y memoria optimizada", async () => {
    const { storage, manager } = makeManager()
    const created = await manager.startSession(USER)
    const ctx = createInitialContext(new Date().toISOString())
    ctx.turns = 2
    ctx.domain = "inventario"
    ctx.topic = "Inventario"
    ctx.intent = "inventario"
    ctx.activeEntity = { type: "product", id: null, name: "Zapato Deportivo" }
    ctx.knownParams = { precio: "35" }
    storage.writeContext(USER, created.conversationId, ctx)

    const prepared = await manager.prepareTurn(USER, created.conversationId, "cámbialo por Botas")
    expect(prepared.referenceResolved).toBe(true)
    expect(prepared.resolvedMessage).toContain("Botas")
    expect(prepared.memory).toContain("Contexto de esta conversación:")
    expect(prepared.memory).toContain("Zapato Deportivo")
  })

  it("detecta cambio de tema y resetea el contexto en prepareTurn", async () => {
    const { storage, manager } = makeManager()
    const created = await manager.startSession(USER)
    const ctx = createInitialContext(new Date().toISOString())
    ctx.turns = 3
    ctx.domain = "inventario"
    ctx.topic = "Inventario"
    storage.writeContext(USER, created.conversationId, ctx)

    const prepared = await manager.prepareTurn(USER, created.conversationId, "quiero revisar los pedidos pendientes")
    expect(prepared.topicChanged).toBe(true)
    expect(prepared.context.domain).toBe("general")
  })

  it("completeTurn persiste contexto y resumen sin lanzar", async () => {
    const { storage, manager } = makeManager()
    const created = await manager.startSession(USER)
    await manager.completeTurn(USER, created.conversationId, {
      userMessage: "crea el producto Zapato Deportivo con precio 35",
      assistantMessage: "Listo, producto creado.",
      toolNames: ["inventory.create_product"],
      intent: "inventario",
      confirmed: false,
    })
    expect(storage.contextBy[created.conversationId].domain).toBe("inventario")
    expect(storage.contextBy[created.conversationId].turns).toBe(1)
    expect(storage.summaryBy[created.conversationId].outcomes).toContain("Producto creado")
  })

  it("autoTitle solo reemplaza el título por defecto", async () => {
    const { storage, manager } = makeManager()
    const created = await manager.startSession(USER)
    const title = await manager.autoTitle(USER, created.conversationId, "crea un producto")
    expect(title).toBe("Crea un producto")
    expect(storage.conversations[0].title).toBe("Crea un producto")

    const kept = await manager.autoTitle(USER, created.conversationId, "otro mensaje")
    expect(kept).toBe("Crea un producto")
  })

  it("busca sesiones por título", async () => {
    const { manager } = makeManager()
    const created = await manager.startSession(USER)
    await manager.renameSession(USER, created.conversationId, "Reporte de ventas marzo")
    const results = await manager.searchSessions(USER, "ventas")
    expect(results.some((r) => r.id === created.conversationId)).toBe(true)
  })

  it("elimina una sesión", async () => {
    const { storage, manager } = makeManager()
    const created = await manager.startSession(USER)
    await manager.deleteSession(USER, created.conversationId)
    expect(storage.conversations).toHaveLength(0)
  })

  it("recupera historial para el cliente", async () => {
    const { manager } = makeManager()
    const created = await manager.startSession(USER)
    const history = await manager.historyMessages(USER, created.conversationId)
    expect(Array.isArray(history)).toBe(true)
  })
})
