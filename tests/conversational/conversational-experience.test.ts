import { describe, expect, it } from "vitest"
import { sanitizeAssistantReply, hasLeaks, inferThinkingLabel, humanizeError, toClientChatView } from "@/lib/conversational"
import type { ChatTurnResult } from "@/lib/conversation/engine"

describe("FASE 5B — sanitizeAssistantReply", () => {
  it("elimina bloques JSON sin romper el texto natural", () => {
    const out = sanitizeAssistantReply('Listo, encontré el producto: {"id":"p1","name":"Peluche Panda","stock":12} ¿Deseas guardarlo?')
    expect(out).not.toContain("{")
    expect(out).not.toContain('"id"')
    expect(out).toContain("Listo, encontré el producto:")
    expect(out).toContain("¿Deseas guardarlo?")
  })

  it("elimina bloques JSON anidados", () => {
    const out = sanitizeAssistantReply('Resumen: {"ventas":1200,"items":[{"name":"X","qty":2}]} y sigue')
    expect(out).not.toContain("{")
    expect(out).not.toContain("[")
    expect(out).toContain("Resumen:")
    expect(out).toContain("y sigue")
  })

  it("elimina nombres internos de herramientas", () => {
    const out = sanitizeAssistantReply("Resultado de analytics.businessSummary: Total: 1200")
    expect(out).not.toContain("analytics")
    expect(out).not.toContain("businessSummary")
    expect(out).toContain("Total: 1200")
  })

  it("elimina providers, modelos y errores técnicos", () => {
    const out = sanitizeAssistantReply("OpenRouter timeout: Tool execution failed en products.create")
    expect(out).not.toContain("OpenRouter")
    expect(out).not.toContain("products.create")
    expect(out).not.toContain("Tool execution failed")
  })

  it("preserva respuestas ya naturales", () => {
    const natural = "No pude completar la acción. ¿Quieres intentarlo nuevamente?"
    expect(sanitizeAssistantReply(natural)).toBe(natural)
  })

  it("quita backticks internos y deja el contenido", () => {
    const out = sanitizeAssistantReply('El código `ABC-123` está disponible')
    expect(out).not.toContain("`")
    expect(out).toContain("ABC-123")
  })

  it("maneja respuestas vacías sin errores", () => {
    expect(sanitizeAssistantReply("")).toBe("")
    expect(sanitizeAssistantReply(undefined as unknown as string)).toBe(undefined)
  })
})

describe("FASE 5B — hasLeaks", () => {
  it("detecta nombres internos, JSON y providers", () => {
    expect(hasLeaks('algo {"x":1}')).toBe(true)
    expect(hasLeaks("Resultado de products.create")).toBe(true)
    expect(hasLeaks("via openrouter")).toBe(true)
    expect(hasLeaks("```json\n{}```")).toBe(true)
  })

  it("acepta respuestas naturales", () => {
    expect(hasLeaks("No pude completar la acción. ¿Quieres intentarlo nuevamente?")).toBe(false)
    expect(hasLeaks("Se creó el producto 'Peluche Panda' con un costo de Bs. 50.")).toBe(false)
  })
})

describe("FASE 5B — inferThinkingLabel", () => {
  it("infiere estados contextuales según la intención del usuario", () => {
    expect(inferThinkingLabel("¿cómo está mi negocio?")).toBe("Analizando tu negocio...")
    expect(inferThinkingLabel("crea un producto nuevo")).toBe("Creando producto...")
    expect(inferThinkingLabel("cuánto stock hay del peluche")).toBe("Consultando inventario...")
    expect(inferThinkingLabel("qué ventas tuve hoy")).toBe("Analizando tus ventas...")
    expect(inferThinkingLabel("crea un cliente llamado Ana")).toBe("Registrando cliente...")
    expect(inferThinkingLabel("hola")).toBe("Pensando...")
  })
})

describe("FASE 5B — humanizeError", () => {
  it("traduce errores técnicos a lenguaje natural", () => {
    expect(humanizeError(new Error("Tool execution failed: products.create"))).toBe("No pude completar esa acción. ¿Quieres intentarlo nuevamente?")
  })

  it("traduce errores de red y timeout", () => {
    expect(humanizeError(new Error("fetch failed"))).toContain("No se pudo conectar")
    expect(humanizeError(new Error("timeout of 10000ms exceeded"))).toContain("Tardé demasiado")
  })

  it("mantiene mensajes ya amigables", () => {
    expect(humanizeError("No pude completar la acción.")).toBe("No pude completar la acción.")
    expect(humanizeError("Demasiadas solicitudes. Intenta en 30s")).toBe("Demasiadas solicitudes. Intenta en 30s")
  })

  it("mantiene mensajes de plan cortos", () => {
    expect(humanizeError('La función "Asistente IA" no está incluida en tu plan actual.')).toContain("tu plan actual")
  })

  it("nunca devuelve vacío ni solo errores de sistema", () => {
    expect(humanizeError("")).toBe("No pude completar esa acción. ¿Quieres intentarlo nuevamente?")
    expect(humanizeError(new Error(""))).toBe("No pude completar esa acción. ¿Quieres intentarlo nuevamente?")
  })
})

describe("FASE 5B — toClientChatView", () => {
  const result: ChatTurnResult = {
    conversationId: "conv-1",
    message: { id: "msg-1", role: "assistant", content: 'ok {"x":1} analytics.businessSummary', timestamp: "t" },
    response: {
      reply: "Se creó el producto correctamente.",
      provider: "openrouter",
      model: "gpt-4o-mini",
      toolCalls: [{ name: "products.create", input: {}, ok: true }],
      ok: true,
    },
    metadata: { status: "completed", intent: "crear_producto" },
    confirmation: {
      actions: [{ stepId: "s1", tool: "products.delete", description: "Eliminar el producto", impact: "No recuperable" }],
      confirmCodes: ["confirm:s1"],
      message: "¿Confirmas?",
      requestedAt: "t",
    },
  }

  it("expone solo lo necesario al cliente", () => {
    const view = toClientChatView(result)
    expect(view.conversationId).toBe("conv-1")
    expect(view.response.ok).toBe(true)
    expect(view.response.reply).toBe("Se creó el producto correctamente.")
    expect(view.metadata.status).toBe("completed")
    expect(view).not.toHaveProperty("provider")
    expect(view).not.toHaveProperty("model")
    expect(view).not.toHaveProperty("toolCalls")
    expect(view).not.toHaveProperty("trace")
  })

  it("sanea el contenido del mensaje", () => {
    const view = toClientChatView(result)
    expect(view.message.content).not.toContain("{")
    expect(view.message.content).not.toContain("analytics")
  })

  it("descarta tool names en las confirmaciones", () => {
    const view = toClientChatView(result)
    const actions = view.confirmation?.actions ?? []
    expect(actions).toHaveLength(1)
    expect(actions[0]).toEqual({ stepId: "s1", description: "Eliminar el producto", impact: "No recuperable" })
    expect(JSON.stringify(actions)).not.toContain("products.delete")
  })
})
