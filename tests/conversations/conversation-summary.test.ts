import { describe, expect, it } from "vitest"
import { buildInitialSummary, createEmptySummary, factFromContext, updateSummary } from "@/lib/conversations/conversation-summary"
import type { ConversationContextState } from "@/lib/conversations/conversation-types"
import { createInitialContext } from "@/lib/conversations/conversation-context"

const NOW = "2026-08-04T12:00:00.000Z"

function contextWith(product: boolean, domain: ConversationContextState["domain"] = "inventario", known: Record<string, string> = {}): ConversationContextState {
  return {
    ...createInitialContext(NOW),
    domain,
    topic: domain === "inventario" ? "Inventario" : "Ventas",
    turns: 1,
    activeEntity: product ? { type: "product", id: null, name: "Zapato Deportivo" } : null,
    knownParams: known,
  }
}

describe("updateSummary", () => {
  it("registra temas, hechos y resultados de un turno", () => {
    const context = contextWith(true, "inventario", { precio: "35" })
    const summary = updateSummary(
      null,
      { userMessage: "crea un producto", assistantMessage: "ok", domain: "inventario", context, actionExecuted: true, toolNames: ["inventory.create_product"] },
      NOW,
    )
    expect(summary.topics).toContainEqual(expect.objectContaining({ name: "Inventario", mentions: 1 }))
    expect(summary.keyFacts[0]).toContain("Zapato Deportivo")
    expect(summary.keyFacts[0]).toContain("precio 35")
    expect(summary.outcomes).toContain("Producto creado")
    expect(summary.messageCount).toBe(2)
  })

  it("acumula menciones del mismo tema", () => {
    const context = contextWith(true, "inventario")
    const first = updateSummary(null, { userMessage: "a", assistantMessage: "b", domain: "inventario", context, actionExecuted: false, toolNames: [] }, NOW)
    const second = updateSummary(first, { userMessage: "c", assistantMessage: "d", domain: "inventario", context, actionExecuted: false, toolNames: [] }, NOW)
    expect(second.topics.find((t) => t.name === "Inventario")?.mentions).toBe(2)
    expect(second.messageCount).toBe(4)
  })

  it("no repite el mismo resultado", () => {
    const context = contextWith(true, "inventario")
    const first = updateSummary(null, { userMessage: "a", assistantMessage: "b", domain: "inventario", context, actionExecuted: true, toolNames: ["inventory.update_stock"] }, NOW)
    const second = updateSummary(first, { userMessage: "c", assistantMessage: "d", domain: "inventario", context, actionExecuted: true, toolNames: ["inventory.update_stock"] }, NOW)
    expect(second.outcomes.filter((o) => o === "Stock actualizado")).toHaveLength(1)
  })

  it("conversaciones largas: recorta hechos por el límite", () => {
    let summary = createEmptySummary(NOW)
    let context = contextWith(true, "inventario")
    for (let i = 0; i < 30; i++) {
      context = { ...context, knownParams: { precio: String(i) } }
      summary = updateSummary(summary, { userMessage: `turno ${i}`, assistantMessage: "ok", domain: "inventario", context, actionExecuted: false, toolNames: [] }, NOW)
    }
    expect(summary.keyFacts.length).toBeLessThanOrEqual(12)
    expect(summary.messageCount).toBe(60)
  })
})

describe("factFromContext", () => {
  it("devuelve null si no hay contexto de negocio", () => {
    expect(factFromContext(createInitialContext(NOW))).toBeNull()
  })

  it("combina entidad y parámetros", () => {
    expect(factFromContext(contextWith(true, "inventario", { precio: "35", cantidad: "15" }))).toContain("precio 35")
    expect(factFromContext(contextWith(true, "inventario", { precio: "35", cantidad: "15" }))).toContain("cantidad 15")
  })
})

describe("buildInitialSummary (historial previo a 5C)", () => {
  it("construye hechos desde mensajes de usuario sin guardar el historial", () => {
    const summary = buildInitialSummary(
      [
        { role: "user", content: "¿cómo van las ventas?" },
        { role: "assistant", content: "respuesta larga que no debería importar para los hechos" },
        { role: "user", content: "muéstrame los pedidos de la semana" },
      ],
      NOW,
    )
    expect(summary.messageCount).toBe(3)
    expect(summary.keyFacts.some((f) => f.includes("¿cómo van las ventas?"))).toBe(true)
    expect(summary.keyFacts.some((f) => f.includes("muéstrame los pedidos de la semana"))).toBe(true)
    expect(summary.keyFacts.some((f) => f.includes("respuesta larga"))).toBe(false)
  })
})
