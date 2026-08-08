import { describe, expect, it } from "vitest"
import { detectConversationIntent, detectQueryIntent } from "@/lib/conversation-ai/intent-detector"
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

describe("detectConversationIntent (FASE 7B) — multi-intención", () => {
  it("detecta varias intenciones a la vez (precio + pedido)", () => {
    const result = detectConversationIntent([
      message("customer", "¿Cuál es el precio de la camisa y cuándo llega mi pedido?", 1),
    ])
    expect(result.intents).toContain("precio")
    expect(result.intents).toContain("pedido")
    expect(result.primaryIntent).toBe("pedido")
    expect(result.signals["pedido"]).toBeTruthy()
  })

  it("detecta precio + disponibilidad en una pregunta de compra", () => {
    const result = detectConversationIntent([
      message("customer", "¿Cuánto cuesta la camisa y tienen talla M?", 1),
    ])
    expect(result.intents).toContain("disponibilidad")
    expect(result.intents).toContain("precio")
    expect(result.confidence).not.toBe("high")
  })

  it("detecta reclamo con confianza alta y sentimiento negativo", () => {
    const result = detectConversationIntent([
      message("customer", "Estoy molesto, mi pedido no llegó y exijo un reembolso", 1),
    ])
    expect(result.primaryIntent).toBe("reclamo")
    expect(result.sentiment).toBe("negative")
    expect(result.confidence).toBe("high")
  })

  it("detecta cobranza con sentimiento neutro", () => {
    const result = detectConversationIntent([
      message("customer", "Hola, quería saber cuánto debo de mi crédito", 1),
    ])
    expect(result.primaryIntent).toBe("cobranza")
    expect(result.sentiment).toBe("neutral")
  })

  it("solo usa mensajes del cliente", () => {
    const result = detectConversationIntent([
      message("customer", "hola", 1),
      message("agent", "¿Cuánto debe usted hoy por su crédito?", 2),
    ])
    expect(result.primaryIntent).toBe("otro")
  })

  it("devuelve otro cuando no hay señales", () => {
    const result = detectConversationIntent([message("customer", "hola buenas tardes", 1)])
    expect(result.primaryIntent).toBe("otro")
    expect(result.intents).toEqual([])
  })
})

describe("detectQueryIntent (FASE 7B) — consultas naturales", () => {
  it.each([
    ["¿Qué ha comprado este cliente?", "compras"],
    ["¿Cuánto debe?", "deuda"],
    ["¿Cuál fue su última compra?", "ultima_compra"],
    ["¿Tiene pedidos pendientes?", "pedidos_pendientes"],
    ["¿Qué productos suele comprar?", "productos_frecuentes"],
    ["¿Hay stock de la camisa negra?", "inventario"],
    ["¿Quién es este cliente?", "cliente"],
  ])("clasifica %s como %s", (question, expected) => {
    expect(detectQueryIntent(question)).toBe(expected)
  })

  it("devuelve otro para preguntas fuera del catálogo", () => {
    expect(detectQueryIntent("¿cuál es la capital de francia?")).toBe("otro")
  })
})
