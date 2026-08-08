import { describe, expect, it, vi } from "vitest"
import {
  HeuristicInboxAiProvider,
  InboxConversationAiService,
  type InboxAiProvider,
} from "@/lib/inbox/conversation-ai"
import { buildInboxRecommendations, type InboxMessageDTO } from "@/lib/inbox/conversation-types"

function message(sender: "customer" | "agent", content: string, index: number): InboxMessageDTO {
  return {
    id: `m-${index}`,
    conversationId: "conv-1",
    channel: "whatsapp",
    sender,
    authorId: sender === "agent" ? "user-1" : null,
    senderName: sender === "customer" ? "María" : "Vendedor",
    recipient: "04141234567",
    content,
    contentType: "text",
    attachments: [],
    status: sender === "customer" ? "received" : "sent",
    createdAt: new Date(2026, 0, index + 1).toISOString(),
  }
}

describe("HeuristicInboxAiProvider (FASE 7A)", () => {
  const provider = new HeuristicInboxAiProvider()

  it("resume una conversación vacía", async () => {
    const summary = await provider.summarize([], { customerName: "María" })
    expect(summary).toContain("no tiene mensajes")
  })

  it("detecta intención de cobranza y sentimiento", async () => {
    const analysis = await provider.analyzeIntent([message("customer", "Hola, debo una cuota que venció ayer", 1)])
    expect(analysis.intent).toBe("cobranza")
    expect(analysis.confidence).not.toBe("low")
  })

  it("sugiere una respuesta acorde a la intención sin enviarla", async () => {
    const suggestion = await provider.suggestReply([message("customer", "¿Cuánto cuesta la talla M?", 1)], {
      customerName: "María",
    })
    expect(suggestion).toContain("María")
    expect(suggestion.toLowerCase()).toContain("disponibilidad")
  })

  it("encuentra historial relevante por palabra clave", async () => {
    const history = await provider.findRelevantHistory("pedido", [
      message("customer", "Hola buenas tardes", 1),
      message("customer", "Quiero saber el estado de mi pedido", 2),
    ])
    expect(history).toContain("pedido")
  })

  it("detecta sentimiento negativo en reclamos", async () => {
    const analysis = await provider.analyzeIntent([
      message("customer", "Estoy molesto, mi pedido no llegó y quiero un reembolso", 1),
    ])
    expect(analysis.sentiment).toBe("negative")
    expect(analysis.intent).toBe("reclamo")
  })
})

describe("buildInboxRecommendations (FASE 7A)", () => {
  const base = {
    customerName: "María",
    lastPurchaseAt: null,
    totalSpent: 0,
    totalOrders: 0,
    activeCredits: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    status: "pendiente",
    lastMessageFromCustomer: true,
    messageCount: 1,
  }

  it("recomienda cobranza vencida cuando hay cuotas vencidas", () => {
    const recs = buildInboxRecommendations({ ...base, overdueAmount: 50 })
    expect(recs.some((r) => r.id === "cobranza_vencida" && r.tone === "danger")).toBe(true)
  })

  it("recomienda cobranza pendiente cuando hay crédito en curso", () => {
    const recs = buildInboxRecommendations({ ...base, pendingAmount: 30, activeCredits: 1 })
    expect(recs.some((r) => r.id === "cobranza_pendiente")).toBe(true)
  })

  it("recomienda reactivación para cliente inactivo", () => {
    const old = new Date(Date.now() - 60 * 86_400_000).toISOString()
    const recs = buildInboxRecommendations({ ...base, lastPurchaseAt: old, totalOrders: 2, totalSpent: 100 })
    expect(recs.some((r) => r.id === "reactivacion")).toBe(true)
  })

  it("recomienda venta repetida a clientes recurrentes", () => {
    const recs = buildInboxRecommendations({ ...base, totalSpent: 200, totalOrders: 3 })
    expect(recs.some((r) => r.id === "venta_repetida" && r.tone === "success")).toBe(true)
  })

  it("no inventa datos: sin señales no hay recomendaciones", () => {
    expect(buildInboxRecommendations(base)).toEqual([])
  })
})

describe("InboxConversationAiService con fallback heurístico (FASE 7A)", () => {
  function fakeDb() {
    const created: Array<{ payload: string; source: string; kind: string }> = []
    return {
      inboxConversation: {
        findUnique: vi.fn().mockResolvedValue({
          storeId: "store-1",
          customer: { name: "María" },
          messages: [
            {
              id: "m-1",
              conversationId: "conv-1",
              channel: "whatsapp",
              sender: "customer",
              authorId: null,
              senderName: "María",
              recipient: "",
              content: "Hola, quiero comprar una camisa",
              contentType: "text",
              attachments: null,
              status: "received",
              createdAt: new Date(),
            },
          ],
        }),
      },
      inboxAiSummary: {
        create: vi.fn(async (args: { data: { payload: string; source: string; kind: string } }) => {
          created.push(args.data)
          return { id: "s-1", ...args.data, createdAt: new Date() }
        }),
        findMany: vi.fn(async () => created.map((c, index) => ({ id: `s-${index}`, ...c, createdAt: new Date() }))),
        deleteMany: vi.fn(async () => ({ count: 0 })),
      },
    }
  }

  it("usa el proveedor de IA real cuando no falla", async () => {
    const provider: InboxAiProvider = {
      summarize: vi.fn(async () => "resumen personalizado"),
      analyzeIntent: vi.fn(async () => ({ intent: "venta", sentiment: "neutral", topics: [], confidence: "high" })),
      suggestReply: vi.fn(async () => "borrador del proveedor"),
      findRelevantHistory: vi.fn(async () => "historial"),
    }
    const service = new InboxConversationAiService(fakeDb() as never, provider)
    const result = await service.summarize({ storeId: "store-1" }, "conv-1")
    expect(result.source).toBe("ai")
    expect(result.content).toBe("resumen personalizado")
  })

  it("cae al heurístico determinista si el proveedor lanza y marca source heuristic", async () => {
    const provider: InboxAiProvider = {
      summarize: vi.fn().mockRejectedValue(new Error("API down")),
      analyzeIntent: vi.fn().mockRejectedValue(new Error("API down")),
      suggestReply: vi.fn().mockRejectedValue(new Error("API down")),
      findRelevantHistory: vi.fn().mockRejectedValue(new Error("API down")),
    }
    const service = new InboxConversationAiService(fakeDb() as never, provider)
    const result = await service.suggestReply({ storeId: "store-1" }, "conv-1")
    expect(result.source).toBe("heuristic")
    expect(result.content.length).toBeGreaterThan(0)
  })

  it("list devuelve los análisis persistidos", async () => {
    const provider: InboxAiProvider = {
      summarize: vi.fn(async () => "resumen"),
      analyzeIntent: vi.fn(async () => ({ intent: "otro", sentiment: "neutral", topics: [], confidence: "low" })),
      suggestReply: vi.fn(async () => "borrador"),
      findRelevantHistory: vi.fn(async () => "historial"),
    }
    const service = new InboxConversationAiService(fakeDb() as never, provider)
    await service.summarize({ storeId: "store-1" }, "conv-1")
    const rows = await service.list({ storeId: "store-1" }, "conv-1")
    expect(rows).toHaveLength(1)
    expect(rows[0].content).toBe("resumen")
  })
})
