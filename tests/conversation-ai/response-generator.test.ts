import { describe, expect, it } from "vitest"
import { generateResponseSuggestions } from "@/lib/conversation-ai/response-generator"
import type {
  CopilotCustomerContext,
  CopilotIntent,
  CopilotIntentDetection,
  CopilotProductHit,
  CopilotMemory,
} from "@/lib/conversation-ai/conversation-types"
import type { InboxMessageDTO } from "@/lib/inbox/conversation-types"

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

function intent(...intents: CopilotIntent[]): CopilotIntentDetection {
  return { intents, primaryIntent: intents[0] ?? "otro", sentiment: "neutral", topics: [], confidence: "medium", signals: {} }
}

function context(over: Partial<CopilotCustomerContext> = {}): CopilotCustomerContext {
  return {
    customer: {
      id: "c-1",
      name: "María",
      phone: "04141234567",
      email: null,
      address: null,
      city: null,
      totalSpent: 200,
      totalOrders: 3,
      lastPurchaseAt: "2026-01-10T00:00:00.000Z",
      tags: [],
    },
    orders: [],
    favoriteProducts: [],
    purchasedProductsCount: 0,
    credits: { activeCredits: 0, pendingAmount: 0, overdueAmount: 0, nextDueDate: null },
    recentInteractions: [],
    notes: [],
    aiRecommendations: [],
    pendingOrders: [],
    totalDebt: 0,
    lastConversation: null,
    ...over,
  }
}

function hit(over: Partial<CopilotProductHit> = {}): CopilotProductHit {
  return {
    productId: "p-1",
    name: "Camisa",
    price: 15.5,
    stock: 4,
    sku: "CAM-1",
    categoryName: "Ropa",
    ...over,
  }
}

describe("generateResponseSuggestions (FASE 7B) — grounded", () => {
  it("sugiere con precio y stock reales del inventario", () => {
    const suggestions = generateResponseSuggestions({
      intent: intent("precio", "disponibilidad"),
      messages: [message("customer", "¿Cuánto cuesta la camisa y tienen stock?", 1)],
      context: context(),
      memory: null,
      inventoryHits: [hit()],
      customerName: "María",
    })
    const grounded = suggestions.find((s) => s.grounded)
    expect(grounded).toBeTruthy()
    expect(grounded?.text).toContain("Camisa")
    expect(grounded?.dataSources).toContain("inventario:precio")
  })

  it("usa el saldo real del cliente en cobranza", () => {
    const suggestions = generateResponseSuggestions({
      intent: intent("cobranza"),
      messages: [message("customer", "Quiero abonar a mi deuda", 1)],
      context: context({
        credits: { activeCredits: 1, pendingAmount: 80, overdueAmount: 20, nextDueDate: null },
        totalDebt: 100,
      }),
      memory: null,
      inventoryHits: [],
      customerName: "María",
    })
    const grounded = suggestions.find((s) => s.grounded && s.dataSources.some((d) => d.startsWith("creditos")))
    expect(grounded).toBeTruthy()
    expect(grounded?.text.toLowerCase()).toContain("abono")
  })

  it("usa el pedido real del cliente", () => {
    const order = {
      id: "o-1",
      orderNumber: "P-100",
      total: 45.5,
      status: "confirmed",
      createdAt: "2026-01-15T00:00:00.000Z",
      items: [{ productName: "Camisa", quantity: 2 }],
    }
    const suggestions = generateResponseSuggestions({
      intent: intent("pedido"),
      messages: [message("customer", "¿En qué estado va mi pedido?", 1)],
      context: context({ orders: [order], pendingOrders: [order] }),
      memory: null,
      inventoryHits: [],
      customerName: "María",
    })
    const grounded = suggestions.find((s) => s.dataSources.includes("pedidos:estado"))
    expect(grounded).toBeTruthy()
    expect(grounded?.text).toContain("P-100")
  })

  it("no inventa datos cuando no hay contexto", () => {
    const suggestions = generateResponseSuggestions({
      intent: intent("otro"),
      messages: [message("customer", "Hola buenas tardes", 1)],
      context: null,
      memory: null,
      inventoryHits: [],
      customerName: "María",
    })
    expect(suggestions.length).toBe(1)
    expect(suggestions[0].grounded).toBe(false)
    expect(suggestions[0].dataSources).toEqual([])
  })

  it("responde reclamos con empatía y sin inventar", () => {
    const suggestions = generateResponseSuggestions({
      intent: intent("reclamo"),
      messages: [message("customer", "Mi pedido no llegó, exijo una solución", 1)],
      context: context(),
      memory: null,
      inventoryHits: [],
      customerName: "María",
    })
    const reclamo = suggestions.find((s) => s.text.toLowerCase().includes("lamento"))
    expect(reclamo).toBeTruthy()
    expect(reclamo?.grounded).toBe(false)
  })

  it("devuelve como máximo 3 sugerencias", () => {
    const suggestions = generateResponseSuggestions({
      intent: intent("precio", "disponibilidad", "venta", "pedido", "cobranza"),
      messages: [message("customer", "¿Cuánto cuesta la camisa y cuándo llega?", 1)],
      context: context({
        orders: [{ id: "o-1", orderNumber: "P-1", total: 10, status: "confirmed", createdAt: "2026-01-01T00:00:00.000Z", items: [] }],
        pendingOrders: [],
        credits: { activeCredits: 1, pendingAmount: 30, overdueAmount: 0, nextDueDate: null },
        totalDebt: 30,
      }),
      memory: null,
      inventoryHits: [hit()],
      customerName: "María",
    })
    expect(suggestions.length).toBeLessThanOrEqual(3)
  })

  it("aplica el tono aprendido en la memoria", () => {
    const memory: CopilotMemory = { tone: "formal", frequentResponses: [], frequentCustomers: [] }
    const suggestions = generateResponseSuggestions({
      intent: intent("venta"),
      messages: [message("customer", "Quiero comprar", 1)],
      context: context(),
      memory,
      inventoryHits: [],
      customerName: "María",
    })
    expect(suggestions[0].text.toLowerCase()).toContain("estimado")
  })
})
