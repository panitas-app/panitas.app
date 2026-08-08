import { describe, expect, it } from "vitest"
import {
  capChartData,
  chartScale,
  donutSegments,
  formatChartValue,
  minPointsFor,
  shouldRenderChart,
  type ChartBlockLike,
} from "@/components/assistant/charts/chart-decision"

function block(type: ChartBlockLike["type"], data: Array<{ label: string; value: number }>, minPoints?: number): ChartBlockLike {
  return { type, data, minPoints }
}

describe("chart-decision (FASE 5E)", () => {
  it("shouldRenderChart respeta el mínimo de puntos por defecto", () => {
    expect(shouldRenderChart(block("bar", [{ label: "A", value: 1 }]))).toBe(false)
    expect(shouldRenderChart(block("bar", [{ label: "A", value: 1 }, { label: "B", value: 2 }]))).toBe(true)
  })

  it("minPointsFor usa el minPoints del bloque", () => {
    expect(minPointsFor(block("line", [], 5))).toBe(5)
    expect(minPointsFor(block("line", []))).toBe(2)
  })

  it("capChartData recorta series largas muestreando", () => {
    const big = Array.from({ length: 100 }, (_, i) => ({ label: `p${i}`, value: i }))
    const capped = capChartData(big, 20)
    expect(capped).toHaveLength(20)
    expect(capChartData(big.slice(0, 5), 20)).toHaveLength(5)
  })

  it("chartScale devuelve un máximo 'bonito'", () => {
    expect(chartScale([3, 7, 12]).niceMax).toBe(20)
    expect(chartScale([]).niceMax).toBe(1)
    expect(chartScale([0, 0]).niceMax).toBe(1)
  })

  it("formatChartValue formatea moneda, porcentaje y número", () => {
    expect(formatChartValue(1250, true, false)).toContain("$")
    expect(formatChartValue(50, false, true)).toBe("50%")
    expect(formatChartValue(12.5, false, false)).toBe("13")
  })

  it("donutSegments reparte proporciones y asigna paleta", () => {
    const { segments, palette } = donutSegments([
      { label: "A", value: 25 },
      { label: "B", value: 75 },
    ])
    expect(segments).toHaveLength(2)
    expect(segments.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5)
    expect(palette).toHaveLength(2)
    expect(palette[0]).toMatch(/^#/)
  })

  it("donutSegments con datos vacíos no explota", () => {
    expect(donutSegments([])).toEqual({ segments: [], palette: [] })
  })

  it("donutSegments respeta el color del dato si viene", () => {
    const { palette } = donutSegments([{ label: "A", value: 1, color: "#ff0000" }])
    expect(palette[0]).toBe("#ff0000")
  })
})
