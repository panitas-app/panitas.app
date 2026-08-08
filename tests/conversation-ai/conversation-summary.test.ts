import { describe, expect, it } from "vitest"
import { buildCopilotSummary, updateCopilotSummary } from "@/lib/conversation-ai/conversation-summary"
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

describe("buildCopilotSummary (FASE 7B)", () => {
  it("resume una conversación vacía", () => {
    const summary = buildCopilotSummary([])
    expect(summary.text).toContain("no tiene mensajes")
    expect(summary.lastMessageId).toBeNull()
  })

  it("resume un único mensaje del cliente", () => {
    const summary = buildCopilotSummary([message("customer", "Hola, quiero una cotización", 1)], {
      customerName: "María",
    })
    expect(summary.text).toContain("María")
    expect(summary.lastMessageId).toBe("m-1")
  })

  it("resume una conversación con intención y tópicos", () => {
    const summary = buildCopilotSummary(
      [
        message("customer", "Hola", 1),
        message("agent", "Buenas María", 2),
        message("customer", "Quiero saber cuánto debo de mi crédito", 3),
      ],
      { customerName: "María" },
    )
    expect(summary.text).toContain("consulta")
    expect(summary.intents).toContain("cobranza")
    expect(summary.keyFacts.length).toBeGreaterThan(0)
  })
})

describe("updateCopilotSummary (FASE 7B) — incremental", () => {
  const m1 = message("customer", "Hola", 1)
  const m2 = message("agent", "Buenas", 2)
  const m3 = message("customer", "¿Cuánto cuesta la camisa?", 3)

  it("devuelve el mismo objeto si no hay mensajes nuevos", () => {
    const summary = buildCopilotSummary([m1, m2])
    expect(updateCopilotSummary(summary, [m1, m2])).toBe(summary)
  })

  it("actualiza solo con los mensajes nuevos y conserva hechos", () => {
    const previous = buildCopilotSummary([m1, m2])
    const next = updateCopilotSummary(previous, [m1, m2, m3])
    expect(next.lastMessageId).toBe("m-3")
    expect(next.keyFacts[0]).toContain("El cliente dijo")
  })

  it("construye desde cero si no hay resumen previo", () => {
    const next = updateCopilotSummary(null, [m1, m2])
    expect(next.lastMessageId).toBe("m-2")
    expect(next.text.length).toBeGreaterThan(0)
  })

  it("soporta conversaciones vacías", () => {
    const previous = buildCopilotSummary([m1])
    expect(updateCopilotSummary(previous, [])).toBe(previous)
  })
})
