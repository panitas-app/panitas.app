/**
 * Lógica pura de tablas conversacionales (FASE 5E).
 *
 * Ordenar, filtrar, buscar y paginar filas sin depender de React. Los tests
 * cubren aquí el comportamiento determinista; el componente `RichTable` solo
 * mantiene estado y delega.
 */

export type SortDirection = "asc" | "desc" | null

/** Convierte un valor de celda a un comparable (número si es numérico). */
export function toComparable(value: string | number): string | number {
  if (typeof value === "number") return value
  const trimmed = value.trim()
  if (trimmed === "" || trimmed === "—") return Number.NEGATIVE_INFINITY
  const stripped = trimmed.replace(/[^0-9.,-]/g, "")
  const numeric = stripped === "" ? Number.NaN : Number(stripped.replace(/,/g, ""))
  if (Number.isFinite(numeric) && trimmed !== "") return numeric
  return trimmed.toLowerCase()
}

/** Compara dos celdas: numérico si ambos lo son, si no por texto. */
export function compareValues(a: string | number, b: string | number): number {
  const ca = toComparable(a)
  const cb = toComparable(b)
  if (typeof ca === "number" && typeof cb === "number") {
    if (ca === Number.NEGATIVE_INFINITY && cb === Number.NEGATIVE_INFINITY) return 0
    return ca - cb
  }
  return String(ca).localeCompare(String(cb), "es")
}

/** Ordena filas por columna; `direction = null` devuelve el orden original. */
export function sortRows(rows: Array<Array<string | number>>, index: number, direction: SortDirection): Array<Array<string | number>> {
  if (!direction || index < 0 || index >= (rows[0]?.length ?? 0)) return rows
  return [...rows].sort((r1, r2) => {
    const cmp = compareValues(r1[index] ?? "", r2[index] ?? "")
    return direction === "asc" ? cmp : -cmp
  })
}

/** Normaliza texto para búsqueda (minúsculas + sin acentos). */
export function normalizeSearch(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

/** Filtra filas cuya búsqueda matchee cualquier celda (case/acento insensible). */
export function filterRows(rows: Array<Array<string | number>>, query: string): Array<Array<string | number>> {
  const q = normalizeSearch(query.trim())
  if (!q) return rows
  return rows.filter((row) => row.some((cell) => normalizeSearch(String(cell)).includes(q)))
}

/** Valores únicos de una columna (para filtros por columna). */
export function columnValues(rows: Array<Array<string | number>>, index: number): string[] {
  const set = new Set<string>()
  for (const row of rows) {
    const v = String(row[index] ?? "").trim()
    if (v && v !== "—") set.add(v)
  }
  return [...set]
}

/** Aplica filtros por columna (AND). El mapa usa índice → valor exacto. */
export function filterByColumns(rows: Array<Array<string | number>>, filters: Record<number, string>): Array<Array<string | number>> {
  const active = Object.entries(filters).filter(([, value]) => value && value !== "__all__")
  if (active.length === 0) return rows
  return rows.filter((row) =>
    active.every(([index, value]) => {
      const cell = String(row[Number(index)] ?? "").trim()
      return cell === value || (value === "__empty__" && (cell === "" || cell === "—"))
    }),
  )
}

export interface Pagination {
  pageRows: Array<Array<string | number>>
  totalPages: number
  start: number
  end: number
}

/** Paginación local de filas (página 1-based). */
export function paginate(rows: Array<Array<string | number>>, page: number, pageSize: number): Pagination {
  const safeSize = Math.max(1, pageSize)
  const totalPages = Math.max(1, Math.ceil(rows.length / safeSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * safeSize
  return {
    pageRows: rows.slice(start, start + safeSize),
    totalPages,
    start,
    end: Math.min(start + safeSize, rows.length),
  }
}
