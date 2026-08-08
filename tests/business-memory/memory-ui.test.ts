import { describe, expect, it } from "vitest"
import {
  buildPanelModel,
  groupMemories,
  memoryKindLabel,
  memoryStatusLabel,
  memoryStrengthLabel,
  memoryDescription,
} from "@/lib/business-memory/memory-ui"
import { makeMemoryItem } from "./helpers"

describe("BusinessMemoryUI (FASE 5G) — panel", () => {
  it("agrupa los recuerdos por tipo en el orden del negocio", () => {
    const items = [
      makeMemoryItem({ key: "bm.preference.currency", kind: "preference" }),
      makeMemoryItem({ key: "bm.terminology.clientes", kind: "terminology" }),
    ]
    const groups = groupMemories(items)
    expect(groups.map((g) => g.kind)).toEqual(["terminology", "preference"])
    expect(groups[0].memories[0].key).toBe("bm.terminology.clientes")
  })

  it("omite los tipos sin recuerdos", () => {
    const groups = groupMemories([makeMemoryItem({ key: "bm.preference.currency", kind: "preference" })])
    expect(groups).toHaveLength(1)
  })

  it("construye el modelo de vista completo", () => {
    const items = [
      makeMemoryItem({ key: "bm.preference.currency", status: "confirmed" }),
      makeMemoryItem({ key: "bm.usage_pattern.ventas", kind: "usage_pattern", status: "candidate" }),
    ]
    const model = buildPanelModel(items, false)
    expect(model.total).toBe(2)
    expect(model.confirmed).toBe(1)
    expect(model.candidates).toBe(1)
    expect(model.learningEnabled).toBe(false)
  })

  it("etiquetas legibles", () => {
    expect(memoryKindLabel("terminology")).toBe("Terminología")
    expect(memoryKindLabel("usage_pattern")).toBe("Patrones de uso")
    expect(memoryStatusLabel("confirmed")).toBe("Confirmado")
    expect(memoryStatusLabel("candidate")).toBe("En aprendizaje")
  })

  it("describe el contenido y la fuerza del recuerdo", () => {
    const item = makeMemoryItem({
      kind: "terminology",
      value: { term: "pacientes", standard: "clientes" },
      metadata: { source: "learned", status: "confirmed", strength: 3, threshold: 3, tags: [] },
    })
    expect(memoryDescription(item)).toContain("pacientes")
    expect(memoryStrengthLabel(item)).toBe("3/3")
  })
})
