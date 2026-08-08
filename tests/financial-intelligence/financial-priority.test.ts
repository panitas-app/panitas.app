import { describe, expect, it } from "vitest"
import {
  priorityFor,
  compareInsights,
  sortInsightsByPriority,
  PRIORITY_ORDER,
  PRIORITY_RANK,
  VENTAS_CAIDA_ALTA,
  GASTOS_AUMENTO_ALTA,
} from "@/lib/financial-intelligence/financial-priority"
import type { FinancialInsight } from "@/lib/financial-intelligence"

function insight(over: Partial<FinancialInsight>): FinancialInsight {
  return {
    id: over.category ?? "flujo_negativo",
    category: over.category ?? "flujo_negativo",
    title: "test",
    priority: over.priority ?? "media",
    value: over.value,
    actions: [],
    ...over,
  }
}

describe("financial-priority (FASE 6D)", () => {
  it("mantiene prioridad base para flujo negativo", () => {
    expect(priorityFor("flujo_negativo")).toBe("alta")
    expect(priorityFor("facturas_vencidas")).toBe("alta")
    expect(priorityFor("por_pagar_mayor")).toBe("alta")
    expect(priorityFor("creditos_vencidos")).toBe("alta")
  })

  it("mantiene prioridad base media para cobranza y proveedores", () => {
    expect(priorityFor("cobrar_esta_semana")).toBe("media")
    expect(priorityFor("pagar_esta_semana")).toBe("media")
    expect(priorityFor("gastos_aumentaron")).toBe("media")
    expect(priorityFor("deuda_concentrada")).toBe("media")
  })

  it("clasifica como baja los insights positivos", () => {
    expect(priorityFor("flujo_positivo")).toBe("baja")
    expect(priorityFor("ventas_crecieron")).toBe("baja")
    expect(priorityFor("recuperacion_creditos")).toBe("baja")
  })

  it("escala ventas cayeron a alta solo con caída >= 25%", () => {
    expect(priorityFor("ventas_cayeron", -10)).toBe("media")
    expect(priorityFor("ventas_cayeron", -24.9)).toBe("media")
    expect(priorityFor("ventas_cayeron", -VENTAS_CAIDA_ALTA)).toBe("alta")
    expect(priorityFor("ventas_cayeron", -60)).toBe("alta")
  })

  it("escala gastos aumentaron a alta solo con aumento >= 50%", () => {
    expect(priorityFor("gastos_aumentaron", 10)).toBe("media")
    expect(priorityFor("gastos_aumentaron", GASTOS_AUMENTO_ALTA)).toBe("alta")
    expect(priorityFor("gastos_aumentaron", 120)).toBe("alta")
  })

  it("no escala sin valor de referencia", () => {
    expect(priorityFor("ventas_cayeron")).toBe("media")
    expect(priorityFor("gastos_aumentaron")).toBe("media")
  })

  it("PRIORITY_ORDER y PRIORITY_RANK coinciden", () => {
    expect(PRIORITY_ORDER).toEqual(["alta", "media", "baja"])
    expect(PRIORITY_RANK.alta).toBe(0)
    expect(PRIORITY_RANK.baja).toBe(2)
  })

  it("compara primero por prioridad y luego por valor", () => {
    const a = insight({ category: "flujo_positivo", priority: "baja", value: 100 })
    const b = insight({ category: "facturas_vencidas", priority: "alta", value: 5 })
    expect(compareInsights(a, b)).toBeGreaterThan(0)
    const c = insight({ category: "ventas_crecieron", priority: "baja", value: 50 })
    expect(compareInsights(a, c)).toBeLessThan(0)
  })

  it("ordena de mayor a menor impacto sin mutar el original", () => {
    const alta = insight({ category: "flujo_negativo", priority: "alta", value: 900 })
    const media = insight({ category: "ventas_cayeron", priority: "media", value: -20 })
    const baja = insight({ category: "flujo_positivo", priority: "baja", value: 300 })
    const original = [baja, alta, media]
    const sorted = sortInsightsByPriority(original)
    expect(sorted.map((i) => i.priority)).toEqual(["alta", "media", "baja"])
    expect(original[0]).toBe(baja)
  })

  it("empata dentro del mismo nivel por valor de impacto", () => {
    const a = insight({ category: "creditos_vencidos", priority: "alta", value: 500 })
    const b = insight({ category: "facturas_vencidas", priority: "alta", value: 800 })
    expect(compareInsights(a, b)).toBeGreaterThan(0)
  })
})
