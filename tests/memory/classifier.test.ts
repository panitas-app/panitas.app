import { describe, expect, it } from "vitest"
import {
  MemoryClassifier,
  importanceFromSignals,
  typeForKind,
  expiresForImportance,
  keyForContent,
} from "@/lib/agent/memory"

describe("MemoryClassifier (FASE 3D)", () => {
  const classifier = new MemoryClassifier()

  it("guarda preferencias del negocio como HIGH long_term", () => {
    const result = classifier.classify({ content: "Prefiero usar precios con IVA incluido", source: "user_message" })
    expect(result.shouldStore).toBe(true)
    expect(result.kind).toBe("preference")
    expect(result.importance).toBe("HIGH")
    expect(result.type).toBe("long_term")
    expect(result.key).toBeTruthy()
  })

  it("guarda identidad del negocio como HIGH fact", () => {
    const result = classifier.classify({ content: "Mi negocio es una panadería artesanal en Caracas", source: "user_message" })
    expect(result.shouldStore).toBe(true)
    expect(result.kind).toBe("fact")
    expect(result.importance).toBe("HIGH")
  })

  it("clasifica señales de cliente como customer HIGH", () => {
    const result = classifier.classify({ content: "El cliente María prefiere entregas los sábados", source: "user_message" })
    expect(result.kind).toBe("customer")
    expect(result.importance).toBe("HIGH")
    expect(result.type).toBe("business")
  })

  it("marca como CRITICAL el stock agotado", () => {
    const result = classifier.classify({ content: "El producto está agotado", source: "user_message" })
    expect(result.importance).toBe("CRITICAL")
    expect(result.type).toBe("short_term")
  })

  it("asigna TTL según importancia (LOW=1d, CRITICAL=sin expiración)", () => {
    expect(expiresForImportance("LOW")).toBeTruthy()
    expect(expiresForImportance("CRITICAL")).toBeNull()
  })

  it("NO guarda small talk ni preguntas operativas genéricas", () => {
    expect(classifier.classify({ content: "Hola buenas tardes", source: "user_message" }).shouldStore).toBe(false)
    expect(classifier.classify({ content: "Gracias por la ayuda", source: "user_message" }).shouldStore).toBe(false)
    expect(classifier.classify({ content: "¿Cuánto vendimos esta semana?", source: "user_message" }).shouldStore).toBe(false)
  })

  it("NO guarda texto demasiado corto ni excesivamente largo", () => {
    expect(classifier.classify({ content: "hola", source: "user_message" }).shouldStore).toBe(false)
    expect(classifier.classify({ content: "x".repeat(700), source: "user_message" }).shouldStore).toBe(false)
  })

  it("genera claves estables para el mismo hecho (upsert)", () => {
    const a = keyForContent("Prefiero usar precios con IVA incluido")
    const b = keyForContent("Prefiero usar precios con IVA incluido")
    expect(a).toBe(b)
  })

  it("importanceFromSignals retorna custom/medium sin señales", () => {
    expect(importanceFromSignals("texto sin señales reconocibles")).toEqual({ kind: "custom", importance: "MEDIUM" })
  })

  it("typeForKind mapea correctamente", () => {
    expect(typeForKind("event")).toBe("short_term")
    expect(typeForKind("preference")).toBe("long_term")
    expect(typeForKind("business_setting")).toBe("business")
  })
})
