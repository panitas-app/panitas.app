import { describe, expect, it } from "vitest"
import {
  columnValues,
  compareValues,
  filterByColumns,
  filterRows,
  normalizeSearch,
  paginate,
  sortRows,
  toComparable,
} from "@/components/assistant/tables/table-logic"

describe("table-logic (FASE 5E)", () => {
  const rows: Array<Array<string | number>> = [
    ["Café", 12, "$120.00"],
    ["Pan", 3, "$45.00"],
    ["Jugo", 8, "$90.00"],
  ]

  it("toComparable convierte moneda y números", () => {
    expect(toComparable("$120.00")).toBe(120)
    expect(toComparable("1,234")).toBe(1234)
    expect(toComparable(42)).toBe(42)
    expect(toComparable("—")).toBe(Number.NEGATIVE_INFINITY)
    expect(toComparable("café")).toBe("café")
  })

  it("compareValues ordena numéricos y texto", () => {
    expect(compareValues("$10.00", "$9.00")).toBeGreaterThan(0)
    expect(compareValues("b", "a")).toBeGreaterThan(0)
    expect(compareValues("a", "b")).toBeLessThan(0)
    expect(compareValues(5, 5)).toBe(0)
  })

  it("sortRows ordena asc/desc sin mutar", () => {
    const asc = sortRows(rows, 1, "asc")
    expect(asc.map((r) => r[1])).toEqual([3, 8, 12])
    const desc = sortRows(rows, 1, "desc")
    expect(desc.map((r) => r[1])).toEqual([12, 8, 3])
    expect(rows.map((r) => r[1])).toEqual([12, 3, 8])
  })

  it("sortRows con null o índice inválido devuelve el original", () => {
    expect(sortRows(rows, 1, null)).toBe(rows)
    expect(sortRows(rows, 99, "asc")).toBe(rows)
  })

  it("normalizeSearch ignora acentos y mayúsculas", () => {
    expect(normalizeSearch("Café Ándale")).toBe("cafe andale")
  })

  it("filterRows matchea cualquier celda", () => {
    expect(filterRows(rows, "pan")).toHaveLength(1)
    expect(filterRows(rows, "café").length).toBeGreaterThanOrEqual(1)
    expect(filterRows(rows, "zzz")).toHaveLength(0)
    expect(filterRows(rows, "")).toHaveLength(rows.length)
  })

  it("columnValues devuelve valores únicos", () => {
    const values = columnValues(rows, 2)
    expect(values).toEqual(expect.arrayContaining(["$120.00", "$45.00", "$90.00"]))
    expect(values).toHaveLength(3)
  })

  it("filterByColumns aplica filtros exactos (AND) y 'aplicaciones vacías' vuelven todo", () => {
    const filtered = filterByColumns(rows, { 1: "8" })
    expect(filtered).toHaveLength(1)
    expect(filtered[0][0]).toBe("Jugo")
    expect(filterByColumns(rows, {})).toBe(rows)
  })

  it("paginate pagina y respeta la página 1-based", () => {
    const p1 = paginate(rows, 1, 2)
    expect(p1.pageRows).toHaveLength(2)
    expect(p1.totalPages).toBe(2)
    const p2 = paginate(rows, 2, 2)
    expect(p2.pageRows).toHaveLength(1)
    expect(p2.pageRows[0][0]).toBe("Jugo")
    expect(paginate(rows, 0, 2).pageRows[0][0]).toBe("Café")
    expect(paginate(rows, 99, 2).pageRows[0][0]).toBe("Jugo")
  })
})
