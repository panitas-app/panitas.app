import { describe, expect, it } from "vitest"
import { buildAssistantGreeting } from "@/lib/assistant-behavior"
import { FINDINGS_GREETING_TEMPLATES } from "@/lib/assistant-behavior"
import { containsForbiddenPhrase } from "@/lib/assistant-behavior"

describe("greeting-generator (FASE 5F)", () => {
  it("saluda según la hora del día", () => {
    expect(buildAssistantGreeting({ hour: 9 }).text).toMatch(/^Buenos días/)
    expect(buildAssistantGreeting({ hour: 14 }).text).toMatch(/^Buenas tardes/)
    expect(buildAssistantGreeting({ hour: 21 }).text).toMatch(/^Buenas noches/)
  })

  it("saludo contextual con hallazgos menciona la cantidad real", () => {
    const greeting = buildAssistantGreeting({ userName: "juan", hour: 9, findingsCount: 3 })
    expect(greeting.userName).toBe("Juan")
    expect(greeting.text).toContain("Buenos días Juan")
    expect(greeting.text).toContain("3 puntos")
  })

  it("singular para un solo hallazgo", () => {
    expect(buildAssistantGreeting({ findingsCount: 1, hour: 9 }).text).toContain("1 punto")
    expect(buildAssistantGreeting({ findingsCount: 1, hour: 9 }).text).not.toContain("puntos")
  })

  it("sin hallazgos no dice que el negocio está bien", () => {
    const greeting = buildAssistantGreeting({ findingsCount: 0, hour: 10 })
    expect(containsForbiddenPhrase(greeting.text)).toBeUndefined()
    expect(greeting.text).not.toMatch(/bien|en orden|nada que reportar/i)
    expect(greeting.text).toMatch(/\?$/)
  })

  it("rota plantillas sin repetir la usada antes", () => {
    const first = buildAssistantGreeting({ userName: "ana", hour: 9, findingsCount: 2, templateIndex: 0 })
    const second = buildAssistantGreeting({ userName: "ana", hour: 9, findingsCount: 2, previousTemplateIndex: 0 })
    expect(first.text).not.toBe(second.text)
  })

  it("cubre todas las plantillas de hallazgos sin repetir", () => {
    const texts = new Set<string>()
    for (let i = 0; i < FINDINGS_GREETING_TEMPLATES.length; i++) {
      const greeting = buildAssistantGreeting({ userName: "pedro", hour: 12, findingsCount: 2, templateIndex: i })
      texts.add(greeting.text)
    }
    expect(texts.size).toBe(FINDINGS_GREETING_TEMPLATES.length)
  })

  it("nunca genera frases prohibidas", () => {
    for (let count = 0; count <= 5; count++) {
      for (let hour = 0; hour < 24; hour += 5) {
        const greeting = buildAssistantGreeting({ findingsCount: count, hour })
        expect(containsForbiddenPhrase(greeting.text)).toBeUndefined()
      }
    }
  })
})
