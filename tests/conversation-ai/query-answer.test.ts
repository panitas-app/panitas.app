import { describe, expect, it } from "vitest"
import { buildQueryAnswer } from "@/lib/conversation-ai/query-answer"
import type { CopilotCustomerContext, CopilotProductHit } from "@/lib/conversation-ai/conversation-types"

function context(over: Partial<CopilotCustomerContext> = {}): CopilotCustomerContext {
  return {
    customer: {
      id: "c-1",
      name: "María",
      phone: "04141234567",
      email: "maria@example.com",
      address: null,
      city: "Quito",
      totalSpent: 250,
      totalOrders: 4,
      lastPurchaseAt: "2026-01-20T00:00:00.000Z",
      tags: ["frecuente"],
    },
    orders: [
      {
        id: "o-1",
        orderNumber: "P-200",
        total: 40,
        status: "delivered",
        createdAt: "2026-01-20T00:00:00.000Z",
        items: [{ productName: "Camisa", quantity: 2 }],
      },
    ],
    favoriteProducts: [{ productId: "p-1", productName: "Camisa", quantity: 5 }],
    purchasedProductsCount: 1,
    credits: { activeCredits: 1, pendingAmount: 60, overdueAmount: 10, nextDueDate: "2026-03-01T00:00:00.000Z" },
    recentInteractions: [],
    notes: [],
    aiRecommendations: [],
    pendingOrders: [
      {
        id: "o-2",
        orderNumber: "P-201",
        total: 22,
        status: "confirmed",
        createdAt: "2026-02-01T00:00:00.000Z",
        items: [],
      },
    ],
    totalDebt: 70,
    lastConversation: null,
    ...over,
  }
}

const hits: CopilotProductHit[] = [
  { productId: "p-1", name: "Camisa", price: 15.5, stock: 4, sku: "CAM-1", categoryName: "Ropa" },
]

describe("buildQueryAnswer (FASE 7B) — consultas grounded", () => {
  it("responde sobre compras del cliente", () => {
    const answer = buildQueryAnswer({ question: "¿Qué ha comprado este cliente?", customerName: null, context: context(), inventoryHits: hits })
    expect(answer.queryIntent).toBe("compras")
    expect(answer.content).toContain("4")
    expect(answer.dataSources).toContain("crm:compras")
  })

  it("responde cuánto debe con desglose real", () => {
    const answer = buildQueryAnswer({ question: "¿Cuánto debe?", customerName: null, context: context(), inventoryHits: [] })
    expect(answer.queryIntent).toBe("deuda")
    expect(answer.content).toContain("debe")
    expect(answer.dataSources).toContain("creditos:pendiente")
  })

  it("afirma sin deuda cuando el saldo es cero", () => {
    const answer = buildQueryAnswer({
      question: "¿Cuánto debe?",
      customerName: null,
      context: context({ credits: { activeCredits: 0, pendingAmount: 0, overdueAmount: 0, nextDueDate: null }, totalDebt: 0 }),
      inventoryHits: [],
    })
    expect(answer.content).toContain("no tiene deudas")
  })

  it("responde la última compra con el pedido real", () => {
    const answer = buildQueryAnswer({ question: "¿Cuál fue su última compra?", customerName: null, context: context(), inventoryHits: [] })
    expect(answer.queryIntent).toBe("ultima_compra")
    expect(answer.content).toContain("P-200")
  })

  it("lista pedidos pendientes", () => {
    const answer = buildQueryAnswer({ question: "¿Tiene pedidos pendientes?", customerName: null, context: context(), inventoryHits: [] })
    expect(answer.queryIntent).toBe("pedidos_pendientes")
    expect(answer.content).toContain("P-201")
  })

  it("responde productos frecuentes", () => {
    const answer = buildQueryAnswer({ question: "¿Qué productos suele comprar?", customerName: null, context: context(), inventoryHits: [] })
    expect(answer.queryIntent).toBe("productos_frecuentes")
    expect(answer.content).toContain("Camisa")
  })

  it("responde inventario con datos reales", () => {
    const answer = buildQueryAnswer({ question: "¿Hay stock de camisas?", customerName: null, context: context(), inventoryHits: hits })
    expect(answer.queryIntent).toBe("inventario")
    expect(answer.content).toContain("Camisa")
    expect(answer.dataSources).toContain("inventario:stock")
  })

  it("muestra la ficha del cliente", () => {
    const answer = buildQueryAnswer({ question: "¿Quién es este cliente?", customerName: null, context: context(), inventoryHits: [] })
    expect(answer.queryIntent).toBe("cliente")
    expect(answer.content).toContain("María")
    expect(answer.content).toContain("04141234567")
  })

  it("responde con honestidad cuando la pregunta no encaja", () => {
    const answer = buildQueryAnswer({ question: "¿cuál es el clima en quito?", customerName: null, context: context(), inventoryHits: [] })
    expect(answer.queryIntent).toBe("otro")
    expect(answer.dataSources).toEqual([])
  })

  it("no inventa datos cuando no hay cliente asociado", () => {
    const noCustomer = context({ customer: null, orders: [], favoriteProducts: [], purchasedProductsCount: 0, pendingOrders: [], totalDebt: 0 })
    const answer = buildQueryAnswer({ question: "¿Qué ha comprado este cliente?", customerName: null, context: noCustomer, inventoryHits: [] })
    expect(answer.dataSources).toEqual([])
  })
})
