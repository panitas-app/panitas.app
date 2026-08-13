import { describe, expect, it } from "vitest"
import { buildWhatsAppUrl, normalizePhone, suggestCategory, suggestLevel } from "@/lib/collection"

describe("suggestLevel", () => {
  it("sugiere nivel 1 para atrasos de 2 días o menos", () => {
    expect(suggestLevel(0)).toBe(1)
    expect(suggestLevel(2)).toBe(1)
  })

  it("sugiere nivel 2 para atrasos de 3 a 10 días", () => {
    expect(suggestLevel(3)).toBe(2)
    expect(suggestLevel(10)).toBe(2)
  })

  it("sugiere nivel 3 para atrasos de 11 días o más", () => {
    expect(suggestLevel(11)).toBe(3)
    expect(suggestLevel(45)).toBe(3)
  })
})

describe("suggestCategory", () => {
  it("sube a último aviso con 2 o más intentos previos", () => {
    expect(suggestCategory(1, 2)).toBe("ultimo_aviso")
    expect(suggestCategory(1, 3)).toBe("ultimo_aviso")
  })

  it("usa el atraso cuando no hay intentos previos", () => {
    expect(suggestCategory(1, 0)).toBe("primer_recordatorio")
    expect(suggestCategory(5, 0)).toBe("segundo_recordatorio")
    expect(suggestCategory(11, 0)).toBe("ultimo_aviso")
  })
})

describe("normalizePhone", () => {
  it("preserva números ya normalizados con prefijo 58", () => {
    expect(normalizePhone("584121234567")).toBe("584121234567")
    expect(normalizePhone("+584121234567")).toBe("584121234567")
  })

  it("agrega el prefijo 58 a números locales", () => {
    expect(normalizePhone("04121234567")).toBe("584121234567")
    expect(normalizePhone("4121234567")).toBe("584121234567")
  })

  it("devuelve vacío si no hay dígitos", () => {
    expect(normalizePhone("")).toBe("")
    expect(normalizePhone("sin número")).toBe("")
  })
})

describe("buildWhatsAppUrl", () => {
  it("construye el enlace wa.me con el texto codificado", () => {
    expect(buildWhatsAppUrl("04121234567", "Hola, saldo pendiente de $1.234,56.")).toBe(
      "https://wa.me/584121234567?text=Hola%2C%20saldo%20pendiente%20de%20%241.234%2C56."
    )
  })
})
