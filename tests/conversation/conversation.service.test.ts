import { describe, expect, it, vi, beforeEach } from "vitest"
import { ConversationService } from "@/services/conversation.service"

vi.mock("@/events/event.service", () => ({
  eventService: { emit: vi.fn() },
}))

vi.mock("@/lib/audit", () => ({
  createAuditEntry: vi.fn(() => ({ catch: vi.fn() })),
}))

import { eventService } from "@/events/event.service"

const ctx = { storeId: "store-1", userId: "user-1" }

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    create: vi.fn().mockResolvedValue({
      id: "conv-1",
      userId: "user-1",
      storeId: "store-1",
      negocioId: null,
      title: "Nueva conversación",
      status: "active",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    }),
    findById: vi.fn().mockResolvedValue({
      id: "conv-1",
      userId: "user-1",
      storeId: "store-1",
      title: "Conversación A",
      status: "active",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
      messages: [],
    }),
    listByUser: vi.fn().mockResolvedValue({ conversations: [], total: 0 }),
    listMessages: vi.fn().mockResolvedValue([]),
    saveMessage: vi.fn().mockResolvedValue({
      id: "msg-1",
      conversationId: "conv-1",
      role: "user",
      content: "hola",
      toolCalls: null,
      metadata: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    }),
    touch: vi.fn().mockResolvedValue({ count: 1 }),
    delete: vi.fn().mockResolvedValue({ count: 1 }),
    ...overrides,
  }
}

describe("ConversationService.createConversation", () => {
  beforeEach(() => vi.clearAllMocks())

  it("crea conversación con el scope del usuario y emite conversation.created", async () => {
    const repo = makeRepo()
    const service = new ConversationService(repo as never)
    const result = await service.createConversation(ctx)

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", storeId: "store-1", title: "Nueva conversación" })
    )
    expect(eventService.emit).toHaveBeenCalledWith(
      "conversation.created",
      expect.objectContaining({ conversationId: "conv-1", storeId: "store-1", userId: "user-1" })
    )
    expect(result).toMatchObject({ id: "conv-1", status: "active", messageCount: 0 })
  })
})

describe("ConversationService.getConversation (aislamiento)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("lanza 404 si la conversación no pertenece al usuario", async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) })
    const service = new ConversationService(repo as never)
    await expect(service.getConversation(ctx, "conv-ajena")).rejects.toMatchObject({ status: 404 })
  })

  it("devuelve la conversación si pertenece al scope", async () => {
    const service = new ConversationService(makeRepo() as never)
    const result = await service.getConversation(ctx, "conv-1")
    expect(result.id).toBe("conv-1")
  })
})

describe("ConversationService.ensureConversation", () => {
  beforeEach(() => vi.clearAllMocks())

  it("reutiliza la conversación si viene el id", async () => {
    const repo = makeRepo()
    const service = new ConversationService(repo as never)
    const result = await service.ensureConversation(ctx, "conv-1")
    expect(repo.create).not.toHaveBeenCalled()
    expect(result.id).toBe("conv-1")
  })

  it("crea una nueva si no viene id", async () => {
    const repo = makeRepo()
    const service = new ConversationService(repo as never)
    const result = await service.ensureConversation(ctx)
    expect(repo.create).toHaveBeenCalled()
    expect(result.id).toBe("conv-1")
  })
})

describe("ConversationService.saveMessage", () => {
  beforeEach(() => vi.clearAllMocks())

  it("lanza 404 si la conversación no pertenece al usuario", async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) })
    const service = new ConversationService(repo as never)
    await expect(service.saveMessage(ctx, "conv-ajena", { role: "user", content: "hola" })).rejects.toMatchObject({
      status: 404,
    })
  })

  it("guarda el mensaje, toca la conversación y emite message.created", async () => {
    const repo = makeRepo()
    const service = new ConversationService(repo as never)
    const result = await service.saveMessage(ctx, "conv-1", {
      role: "user",
      content: "hola",
      toolCalls: [{ name: "inventory.check_stock", input: { sku: "A" }, ok: true }],
    })

    expect(repo.saveMessage).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: "conv-1", role: "user", content: "hola" })
    )
    expect(repo.touch).toHaveBeenCalledWith("conv-1", { userId: "user-1", storeId: "store-1" })
    expect(eventService.emit).toHaveBeenCalledWith(
      "message.created",
      expect.objectContaining({ conversationId: "conv-1", role: "user" })
    )
    expect(result).toMatchObject({ id: "msg-1", role: "user", content: "hola" })
    expect(result.timestamp).toBe("2026-01-01T00:00:00.000Z")
  })
})

describe("ConversationService.deleteConversation", () => {
  beforeEach(() => vi.clearAllMocks())

  it("lanza 404 si no se eliminó ninguna fila (no es del usuario)", async () => {
    const repo = makeRepo({ delete: vi.fn().mockResolvedValue({ count: 0 }) })
    const service = new ConversationService(repo as never)
    await expect(service.deleteConversation(ctx, "conv-ajena")).rejects.toMatchObject({ status: 404 })
  })

  it("elimina y emite conversation.deleted", async () => {
    const repo = makeRepo()
    const service = new ConversationService(repo as never)
    const result = await service.deleteConversation(ctx, "conv-1")
    expect(repo.delete).toHaveBeenCalledWith("conv-1", { userId: "user-1", storeId: "store-1" })
    expect(eventService.emit).toHaveBeenCalledWith("conversation.deleted", expect.objectContaining({ conversationId: "conv-1" }))
    expect(result).toEqual({ deleted: true })
  })
})
