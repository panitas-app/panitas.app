import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { CopilotService } from "@/lib/conversation-ai/copilot-service"
import { HeuristicCopilotLlmProvider } from "@/lib/conversation-ai/copilot-llm"
import { COPILOT_EVENTS } from "@/lib/conversation-ai/conversation-types"
import { registerCopilotListener } from "@/lib/events"
import { getEventSystem, resetEventSystemForTest } from "@/lib/events"

type Seed = { id: string; content: string; sender: "customer" | "agent" }

function toRow(seed: Seed) {
  return {
    id: seed.id,
    conversationId: "conv-1",
    channel: "whatsapp",
    sender: seed.sender,
    authorId: seed.sender === "agent" ? "user-1" : null,
    senderName: seed.sender === "customer" ? "María" : "Vendedor",
    recipient: "04141234567",
    content: seed.content,
    contentType: "text",
    status: seed.sender === "customer" ? "received" : "sent",
    createdAt: new Date(),
  }
}

function fakeDb(seeds: Seed[]) {
  return {
    inboxConversation: {
      findUnique: vi.fn(async () => ({
        storeId: "store-1",
        status: "pendiente",
        customerId: null,
        messages: seeds.map(toRow),
        notes: [],
      })),
    },
    product: { findMany: vi.fn(async () => []) },
  }
}

function fakeMemory() {
  const store = new Map<string, { value: unknown }>()
  return {
    get: vi.fn(async (_ctx: unknown, key: string) => store.get(key) ?? null),
    observe: vi.fn(async (_ctx: unknown, obs: { key: string; value: unknown }) => {
      store.set(obs.key, { value: obs.value })
      return null
    }),
  }
}

const ctx = { storeId: "store-1" }
const flush = () => new Promise((resolve) => setTimeout(resolve, 10))

function makeService(seeds: Seed[]) {
  const db = fakeDb(seeds)
  const service = new CopilotService({
    db: db as never,
    provider: new HeuristicCopilotLlmProvider(),
    memory: fakeMemory() as never,
  })
  return { db, service }
}

beforeEach(() => {
  resetEventSystemForTest()
})

afterEach(() => {
  resetEventSystemForTest()
})

describe("CopilotService.analyze (FASE 7B)", () => {
  it("genera un análisis fresco con resumen, intención y contexto", async () => {
    const { service } = makeService([
      { id: "m-1", content: "Hola buenas tardes", sender: "customer" },
      { id: "m-2", content: "¿Cuánto cuesta la camisa?", sender: "customer" },
    ])
    const analysis = await service.analyze(ctx, "conv-1")

    expect(analysis.fresh).toBe(true)
    expect(analysis.lastMessageId).toBe("m-2")
    expect(analysis.intent.intents).toContain("precio")
    expect(analysis.context).not.toBeNull()
    expect(analysis.context?.customer).toBeNull()
    expect(analysis.suggestions.length).toBeGreaterThan(0)
  })

  it("usa la caché incremental: no reanaliza sin mensajes nuevos", async () => {
    const { service } = makeService([
      { id: "m-1", content: "Hola", sender: "customer" },
      { id: "m-2", content: "¿Cuánto debo?", sender: "customer" },
    ])
    const first = await service.analyze(ctx, "conv-1")
    expect(first.fresh).toBe(true)

    const cached = await service.analyze(ctx, "conv-1")
    expect(cached.fresh).toBe(false)
    expect(cached.generatedAt).toBe(first.generatedAt)
  })

  it("reanaliza cuando llega un mensaje nuevo", async () => {
    const { db, service } = makeService([{ id: "m-1", content: "Hola", sender: "customer" }])
    await service.analyze(ctx, "conv-1")

    db.inboxConversation.findUnique.mockResolvedValue({
      storeId: "store-1",
      status: "pendiente",
      customerId: null,
      messages: [
        { id: "m-1", content: "Hola", sender: "customer" },
        { id: "m-2", content: "¿Tienen stock?", sender: "customer" },
      ].map(toRow),
      notes: [],
    })

    const fresh = await service.analyze(ctx, "conv-1")
    expect(fresh.fresh).toBe(true)
    expect(fresh.lastMessageId).toBe("m-2")
  })

  it("force=true reanaliza aunque no haya mensajes nuevos", async () => {
    const { service } = makeService([{ id: "m-1", content: "Hola", sender: "customer" }])
    await service.analyze(ctx, "conv-1")
    const forced = await service.analyze(ctx, "conv-1", { force: true })
    expect(forced.fresh).toBe(true)
  })
})

describe("CopilotService.query (FASE 7B) — consultas naturales", () => {
  it("responde una consulta de deuda sin inventar", async () => {
    const { service } = makeService([{ id: "m-1", content: "Hola", sender: "customer" }])
    const answer = await service.query(ctx, "conv-1", "¿Cuánto debe este cliente?")
    expect(answer.queryIntent).toBe("deuda")
    expect(answer.content.length).toBeGreaterThan(0)
    expect(answer.dataSources.length).toBeGreaterThan(0)
  })

  it("rechaza preguntas vacías", async () => {
    const { service } = makeService([])
    await expect(service.query(ctx, "conv-1", "   ")).rejects.toThrow()
  })
})

describe("CopilotService eventos (FASE 7B)", () => {
  it("publica los 4 eventos conversation.* del copiloto", async () => {
    const { service } = makeService([{ id: "m-1", content: "Quiero comprar una camisa", sender: "customer" }])

    const seen: string[] = []
    const off = getEventSystem().bus.subscribeAll((event) => {
      if ((event.data as { domain?: string })?.domain === "copilot") seen.push(event.type)
    })

    await service.analyze(ctx, "conv-1")
    await flush()
    off()

    for (const type of COPILOT_EVENTS) {
      expect(seen).toContain(type)
    }
  })

  it("un listener registrado recibe los eventos del copiloto", async () => {
    const { service } = makeService([{ id: "m-1", content: "Mi pedido no llegó", sender: "customer" }])

    const received: string[] = []
    registerCopilotListener(getEventSystem().bus, { onEvent: (record) => received.push(record.type) })

    await service.analyze(ctx, "conv-1")
    await flush()

    expect(received).toEqual(expect.arrayContaining([...COPILOT_EVENTS]))
  })
})
