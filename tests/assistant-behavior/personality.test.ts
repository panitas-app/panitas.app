import { describe, expect, it } from "vitest"
import {
  assertPersonalitySafe,
  containsForbiddenPhrase,
  FORBIDDEN_PHRASES,
  FINDINGS_GREETING_TEMPLATES,
  greetingPartOfDay,
  pickGreetingTemplateIndex,
  sanitizeAssistantText,
} from "@/lib/assistant-behavior"

describe("assistant-personality (FASE 5F)", () => {
  it("detecta frases prohibidas", () => {
    expect(containsForbiddenPhrase("Hola, como IA te respondo")).toBeDefined()
    expect(containsForbiddenPhrase("Tu negocio está bien")).toBeDefined()
    expect(containsForbiddenPhrase("No encontramos nada pendiente")).toBeDefined()
    expect(containsForbiddenPhrase("un mensaje normal y útil")).toBeUndefined()
  })

  it("sanitiza eliminando frases prohibidas", () => {
    const clean = sanitizeAssistantText("No puedo mostrarte eso. Pero sí esto.")
    expect(clean).not.toMatch(/no puedo/i)
    expect(clean).toContain("mostrarte eso")
  })

  it("assertPersonalitySafe falla ante frases prohibidas", () => {
    expect(() => assertPersonalitySafe("Procesando tu solicitud...")).toThrow()
    expect(() => assertPersonalitySafe("Todo funciona correctamente")).toThrow()
    expect(() => assertPersonalitySafe("Claro, aquí tienes tus ventas.")).not.toThrow()
  })

  it("el catálogo de prohibidas cubre el lenguaje vacío y robótico", () => {
    expect(FORBIDDEN_PHRASES).toContain("como ia")
    expect(FORBIDDEN_PHRASES).toContain("no puedo")
    expect(FORBIDDEN_PHRASES).toContain("tu negocio está bien")
    expect(FORBIDDEN_PHRASES).toContain("no encontramos nada")
    expect(FORBIDDEN_PHRASES).toContain("todo funciona correctamente")
  })

  it("parte del día según la hora", () => {
    expect(greetingPartOfDay(6)).toBe("Buenos días")
    expect(greetingPartOfDay(12)).toBe("Buenas tardes")
    expect(greetingPartOfDay(19)).toBe("Buenas noches")
  })

  it("pickGreetingTemplateIndex no repite el índice anterior", () => {
    expect(pickGreetingTemplateIndex({ userName: "luis", hour: 10, previousUsedIndex: 0 })).not.toBe(0)
    expect(pickGreetingTemplateIndex({ userName: "luis", hour: 10 })).toBeGreaterThanOrEqual(0)
    expect(pickGreetingTemplateIndex({ userName: "luis", hour: 10 })).toBeLessThan(FINDINGS_GREETING_TEMPLATES.length)
  })
})
