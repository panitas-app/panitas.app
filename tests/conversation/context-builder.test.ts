import { describe, expect, it } from "vitest"
import { buildConversationalHistory } from "@/lib/conversation/context-builder"
import type { Message } from "@/lib/agent-core/types"

function msg(content: string, ts: string): Message {
  return { id: `m-${ts}-${content.length}`, role: "user", content, timestamp: ts }
}

describe("buildConversationalHistory", () => {
  const now = Date.now()
  const recent = (minutesAgo: number) => new Date(now - minutesAgo * 60 * 1000).toISOString()

  it("conserva solo los últimos N mensajes", () => {
    const messages = Array.from({ length: 50 }, (_, i) => msg(`mensaje ${i}`, recent(50 - i)))
    const result = buildConversationalHistory(messages, { maxMessages: 10, maxAgeDays: 365 })
    expect(result).toHaveLength(10)
    expect(result[0].content).toBe("mensaje 40")
    expect(result[9].content).toBe("mensaje 49")
  })

  it("recorta por tamaño total de caracteres conservando los más recientes", () => {
    const messages = Array.from({ length: 20 }, (_, i) => msg(`x`.repeat(100), recent(20 - i)))
    const result = buildConversationalHistory(messages, { maxMessages: 20, maxChars: 500, maxAgeDays: 365 })
    expect(result.length).toBeGreaterThan(0)
    const totalChars = result.reduce((sum, m) => sum + m.content.length, 0)
    expect(totalChars).toBeLessThanOrEqual(600)
    expect(result[result.length - 1].content).toBe(`x`.repeat(100))
  })

  it("filtra mensajes más antiguos que maxAgeDays", () => {
    const messages = [
      msg("viejo", new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString()),
      msg("reciente", recent(1)),
    ]
    const result = buildConversationalHistory(messages, { maxAgeDays: 30 })
    expect(result).toHaveLength(1)
    expect(result[0].content).toBe("reciente")
  })

  it("conserva el mensaje más reciente aunque supere el límite de caracteres", () => {
    const messages = [msg("a".repeat(10000), recent(1))]
    const result = buildConversationalHistory(messages, { maxChars: 500 })
    expect(result).toHaveLength(1)
  })

  it("usa los límites por defecto si no se pasan", () => {
    const messages = Array.from({ length: 60 }, (_, i) => msg(`m ${i}`, recent(60 - i)))
    const result = buildConversationalHistory(messages)
    expect(result.length).toBeLessThanOrEqual(30)
  })
})
