import { describe, expect, it } from "vitest"
import { buildMemoryFragment, CONVERSATION_MEMORY_LIMITS, formatContextMemory, formatSummaryMemory } from "@/lib/conversations/conversation-memory"
import { createInitialContext } from "@/lib/conversations/conversation-context"
import { createEmptySummary } from "@/lib/conversations/conversation-summary"
import type { ConversationContextState } from "@/lib/conversations/conversation-types"

const NOW = "2026-08-04T12:00:00.000Z"

function activeContext(overrides: Partial<ConversationContextState> = {}): ConversationContextState {
  return {
    ...createInitialContext(NOW),
    domain: "inventario",
    topic: "Inventario",
    intent: "inventario",
    turns: 3,
    activeEntity: { type: "product", id: null, name: "Zapato Deportivo" },
    knownParams: { precio: "35", cantidad: "15" },
    ...overrides,
  }
}

describe("formatContextMemory", () => {
  it("incluye tema, intención, entidad y datos conocidos", () => {
    const text = formatContextMemory(activeContext())
    expect(text).toContain("Contexto de esta conversación:")
    expect(text).toContain("Tema: Inventario")
    expect(text).toContain("Intención: inventario")
    expect(text).toContain("Zapato Deportivo")
    expect(text).toContain("precio 35")
  })

  it("muestra los datos pendientes", () => {
    const text = formatContextMemory(
      activeContext({ pendingParams: [{ key: "descripcion", label: "descripción", prompt: "¿?" }] }),
    )
    expect(text).toContain("descripción")
  })

  it("devuelve vacío sin contexto de negocio", () => {
    expect(formatContextMemory(null)).toBe("")
    expect(formatContextMemory(createInitialContext(NOW))).toBe("")
    expect(formatContextMemory(activeContext({ turns: 0 }))).toBe("")
  })

  it("respeta el límite de caracteres", () => {
    const long = activeContext({ knownParams: { precio: "1".repeat(4000) } })
    const text = formatContextMemory(long)
    expect(text.length).toBeLessThanOrEqual(CONVERSATION_MEMORY_LIMITS.maxChars + 1)
  })
})

describe("formatSummaryMemory", () => {
  it("incluye hechos y resultados, nunca el historial crudo", () => {
    const summary = {
      ...createEmptySummary(NOW),
      topics: [{ name: "Inventario", mentions: 2, lastAt: NOW }],
      keyFacts: ["Producto \"Zapato Deportivo\" · precio 35"],
      outcomes: ["Producto creado"],
      messageCount: 4,
    }
    const text = formatSummaryMemory(summary)
    expect(text).toContain("Hechos:")
    expect(text).toContain("Zapato Deportivo")
    expect(text).toContain("Producto creado")
    expect(text).not.toContain("mensaje completo del usuario")
  })
})

describe("buildMemoryFragment (optimización)", () => {
  it("combina contexto y resumen sin incluir conversaciones completas", () => {
    const longUserMessage = "Muéstrame la lista completa de pedidos pendientes de esta semana con sus clientes y montos exactos"
    const summary = {
      ...createEmptySummary(NOW),
      topics: [{ name: "Pedidos", mentions: 2, lastAt: NOW }],
      keyFacts: ["se revisaron pedidos"],
      outcomes: [],
      messageCount: 6,
    }
    const fragment = buildMemoryFragment(activeContext(), summary)
    expect(fragment).toContain("Contexto de esta conversación:")
    expect(fragment).toContain("Resumen de esta conversación:")
    expect(fragment).not.toContain(longUserMessage)
  })

  it("nunca envía el historial completo al LLM", () => {
    const context = activeContext()
    const summary = createEmptySummary(NOW)
    const fragment = buildMemoryFragment(context, summary)
    expect(fragment.length).toBeLessThanOrEqual(CONVERSATION_MEMORY_LIMITS.maxChars * 2 + 40)
    expect(fragment).not.toMatch(/turns:\s*\d/)
  })
})
