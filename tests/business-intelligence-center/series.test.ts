import { describe, expect, it } from "vitest"
import {
  monthKey,
  monthLabel,
  lastMonths,
  buildMonthlySeries,
} from "@/lib/business-intelligence-center"

describe("series (FASE 5A)", () => {
  it("genera la clave YYYY-MM de una fecha", () => {
    expect(monthKey(new Date(2026, 0, 15))).toBe("2026-01")
    expect(monthKey(new Date(2026, 11, 1))).toBe("2026-12")
  })

  it("formatea la etiqueta corta del mes", () => {
    expect(monthLabel("2026-01")).toBe("Ene 26")
    expect(monthLabel("2026-12")).toBe("Dic 26")
  })

  it("genera los últimos N meses incluyendo el actual", () => {
    const keys = lastMonths(3, new Date(2026, 2, 10)) // marzo 2026
    expect(keys).toEqual(["2026-01", "2026-02", "2026-03"])
  })

  it("construye la serie completa rellenando meses sin datos con cero", () => {
    const series = buildMonthlySeries(
      { "2026-03": 100 },
      { "2026-02": 40 },
      3,
      new Date(2026, 2, 10)
    )
    expect(series).toHaveLength(3)
    expect(series[0]).toEqual({ month: "2026-01", label: "Ene 26", revenue: 0, expenses: 0 })
    expect(series[1]).toEqual({ month: "2026-02", label: "Feb 26", revenue: 0, expenses: 40 })
    expect(series[2]).toEqual({ month: "2026-03", label: "Mar 26", revenue: 100, expenses: 0 })
  })

  it("respeta la cantidad de meses pedida", () => {
    const series = buildMonthlySeries({}, {}, 12, new Date(2026, 5, 1))
    expect(series).toHaveLength(12)
    expect(series[0].month).toBe("2025-07")
    expect(series[11].month).toBe("2026-06")
  })
})
