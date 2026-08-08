import { describe, expect, it } from "vitest"
import { suggestActions } from "@/lib/conversation-ai/action-suggestions"
import type { CopilotIntent, CopilotIntentDetection } from "@/lib/conversation-ai/conversation-types"

function intent(...intents: CopilotIntent[]): CopilotIntentDetection {
  return { intents, primaryIntent: intents[0] ?? "otro", sentiment: "neutral", topics: [], confidence: "medium", signals: {} }
}

describe("suggestActions (FASE 7B)", () => {
  it("sugiere crear pedido y cotización ante intención de venta", () => {
    const actions = suggestActions({
      intent: intent("venta"),
      customerId: "c-1",
      hasPendingOrders: false,
      hasActiveCredits: false,
      totalDebt: 0,
      hasInventoryHits: true,
    })
    const types = actions.map((a) => a.type)
    expect(types).toContain("create_order")
    expect(types).toContain("create_quote")
    expect(types).toContain("open_customer_profile")
  })

  it("sugiere registrar cliente si no hay ficha asociada", () => {
    const actions = suggestActions({
      intent: intent("venta"),
      customerId: null,
      hasPendingOrders: false,
      hasActiveCredits: false,
      totalDebt: 0,
      hasInventoryHits: false,
    })
    expect(actions.map((a) => a.type)).toContain("register_customer")
  })

  it("sugiere crédito y pago ante cobranza o deuda", () => {
    const actions = suggestActions({
      intent: intent("cobranza"),
      customerId: "c-1",
      hasPendingOrders: false,
      hasActiveCredits: true,
      totalDebt: 50,
      hasInventoryHits: false,
    })
    const types = actions.map((a) => a.type)
    expect(types).toContain("check_credit")
    expect(types).toContain("register_payment")
  })

  it("sugiere revisar pedidos si hay pendientes", () => {
    const actions = suggestActions({
      intent: intent("pedido"),
      customerId: "c-1",
      hasPendingOrders: true,
      hasActiveCredits: false,
      totalDebt: 0,
      hasInventoryHits: false,
    })
    expect(actions.map((a) => a.type)).toContain("check_orders")
  })

  it("sugiere consultar inventario ante preguntas de precio/disponibilidad", () => {
    const actions = suggestActions({
      intent: intent("precio", "disponibilidad"),
      customerId: "c-1",
      hasPendingOrders: false,
      hasActiveCredits: false,
      totalDebt: 0,
      hasInventoryHits: true,
    })
    expect(actions.map((a) => a.type)).toContain("check_inventory")
  })

  it("no duplica acciones (register_payment aparece una sola vez)", () => {
    const actions = suggestActions({
      intent: intent("cobranza"),
      customerId: "c-1",
      hasPendingOrders: false,
      hasActiveCredits: true,
      totalDebt: 50,
      hasInventoryHits: false,
    })
    const payments = actions.filter((a) => a.type === "register_payment")
    expect(payments).toHaveLength(1)
  })

  it("las acciones con href apuntan a rutas reales del dashboard", () => {
    const actions = suggestActions({
      intent: intent("venta", "cobranza", "pedido"),
      customerId: "c-1",
      hasPendingOrders: true,
      hasActiveCredits: true,
      totalDebt: 10,
      hasInventoryHits: true,
    })
    for (const action of actions) {
      expect(action.href).toMatch(/^\/dashboard\//)
    }
  })
})
