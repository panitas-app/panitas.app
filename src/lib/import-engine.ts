import * as XLSX from "xlsx"
import Fuse from "fuse.js"
import Papa from "papaparse"
import { safeStr, safeFloat, safeInt, safeBool } from "./validate"

// Known product field names (Spanish + English aliases)
export const FIELD_ALIASES: Record<string, string[]> = {
  name: ["nombre", "producto", "name", "product", "articulo", "artículo", "descripcion", "descripción", "description", "denominacion", "denominación", "item", "articulo name", "nombre del producto", "producto nombre", "producto name"],
  price: ["precio", "price", "venta", "pvp", "pvp usd", "precio venta", "precio de venta", "precio usd", "precio final", "precio venta usd", "pv", "pvps", "sell price", "retail price", "public price", "precio publico", "precio público"],
  costPrice: ["costo", "cost", "costo usd", "precio costo", "cost price", "costo unitario", "costo unitario usd", "precio de costo", "costo base", "cost base", "purchase price", "precio compra", "precio de compra", "costo de compra", "costo promedio"],
  sku: ["sku", "codigo", "código", "code", "cod", "ref", "referencia", "cod. barras", "código de barras", "barcode", "codigo de barras", "referencia producto", "cod producto", "cod. producto"],
  stock: ["stock", "cantidad", "qty", "quantity", "inventario", "existencias", "disponible", "existencia", "stock actual", "cantidad disponible", "inventario actual", "disponibilidad", "stock disponible", "unidades"],
  unidadBase: ["unidad", "unit", "medida", "um", "unidad base", "unid", "unidades", "unit of measure", "uom", "medida base", "tipo unidad", "unidad de medida"],
  description: ["detalle", "detalles", "info", "informacion", "información", "obs", "observaciones", "notas", "note", "notes", "comments", "comentarios", "descripcion producto", "descripción del producto", "product description"],
  isActive: ["activo", "active", "estado", "habilitado", "disponible", "status", "estatus", "habilitada", "enabled", "is active"],
  featured: ["destacado", "featured", "promocion", "promoción", "promoted", "es destacado", "principal", "highlight"],
  isWholesale: ["mayorista", "wholesale", "mayoreo", "mayorista activo", "wholesale enabled", "venta al mayor"],
  wholesalePrice: ["precio mayorista", "wholesale price", "precio mayoreo", "precio mayoreo usd", "wholesale usd", "precio al mayor", "mayorista precio"],
  wholesaleLabel: ["etiqueta mayorista", "wholesale label", "minimo mayoreo", "min mayoreo", "cantidad minima mayoreo", "mínimo mayoreo"],
  categoryId: ["categoria", "categoría", "category", "cat", "grupo", "grupo producto", "tipo", "type", "category id", "id categoria"],
}

// All known field keywords for header detection
const ALL_FIELD_KEYWORDS = new Set<string>()
for (const aliases of Object.values(FIELD_ALIASES)) {
  for (const alias of aliases) {
    ALL_FIELD_KEYWORDS.add(alias.toLowerCase())
  }
}
// Extra keywords that appear in header rows but aren't field aliases
const HEADER_SIGNAL_KEYWORDS = ["foto", "image", "imagen", "img", "codigo", "código", "cod"]

export interface DetectedColumn {
  header: string
  mappedField: string | null
  confidence: number // 0-1
  sampleValues: string[]
}

export interface ParsedRow {
  [key: string]: string | number | boolean | null
}

export interface ImportPreview {
  columns: DetectedColumn[]
  rows: ParsedRow[]
  totalRows: number
  errors: string[]
  categories: string[]
  headerRowIndex: number
}

export interface MappedRow {
  name: string
  price: number
  costPrice: number | null
  sku: string | null
  stock: number
  unidadBase: string
  description: string | null
  isActive: boolean
  featured: boolean
  isWholesale: boolean
  wholesalePrice: number | null
  wholesaleLabel: string | null
  categoryId: string | null
  category: string | null
}

// ─── Smart Header Detection ───────────────────────────────────────────────

function isHeaderKeyword(val: string): boolean {
  const lower = val.toLowerCase().trim()
  if (ALL_FIELD_KEYWORDS.has(lower)) return true
  for (const kw of HEADER_SIGNAL_KEYWORDS) {
    if (lower.includes(kw)) return true
  }
  return false
}

export function detectHeaderRow(rawRows: (string | number | null)[][]): number {
  for (let i = 0; i < Math.min(rawRows.length, 30); i++) {
    const row = rawRows[i]
    if (!row) continue
    let matches = 0
    for (const cell of row) {
      if (cell !== null && cell !== undefined && cell !== "") {
        if (isHeaderKeyword(String(cell))) matches++
      }
    }
    if (matches >= 2) return i
  }
  return 0 // Fallback: use first row
}

export function extractCategories(rawRows: (string | number | null)[][], headerRowIndex: number): { name: string; startRow: number }[] {
  const categories: { name: string; startRow: number }[] = []

  // Also scan rows BEFORE the header for category-like rows (e.g. "CONECTORES RAPIDOS" at row 7)
  for (let i = 0; i < headerRowIndex; i++) {
    const row = rawRows[i]
    if (!row) continue
    const colA = row[0] != null ? String(row[0]).trim() : ""
    const hasOtherData = row.slice(1).some((c) => c !== null && c !== undefined && c !== "")
    if (colA.length >= 3 && !hasOtherData) {
      if (/^\d/.test(colA)) continue
      if (/TEL|FONO|CEL|PHONE|DIR|INSTAGRAM|FACEBOOK/i.test(colA)) continue
      categories.push({ name: colA, startRow: headerRowIndex }) // Assign to header row so all data gets this category
    }
  }

  // Then scan after header for normal category separators
  for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
    const row = rawRows[i]
    if (!row) continue

    const colA = row[0] != null ? String(row[0]).trim() : ""
    const hasOtherData = row.slice(1).some((c) => c !== null && c !== undefined && c !== "")

    // Category header: first column has text, rest is empty
    if (colA.length >= 3 && !hasOtherData) {
      // Skip if it looks like metadata (address, phone, etc.)
      if (/^\d/.test(colA)) continue // starts with number
      if (/TEL|FONO|CEL|PHONE|DIR|INSTAGRAM|FACEBOOK/i.test(colA)) continue
      categories.push({ name: colA, startRow: i })
    }
  }

  return categories
}

function isRepeatedHeaderRow(row: (string | number | null)[]): boolean {
  let matches = 0
  let nonEmpty = 0
  for (const cell of row) {
    if (cell !== null && cell !== undefined && cell !== "") {
      nonEmpty++
      if (isHeaderKeyword(String(cell))) matches++
    }
  }
  // If most non-empty cells match header keywords, it's a repeated header row
  return nonEmpty >= 2 && matches >= Math.ceil(nonEmpty * 0.5)
}

function assignCategoryToRow(
  rowIndex: number,
  categories: { name: string; startRow: number }[],
): string | null {
  let currentCat: string | null = null
  for (const cat of categories) {
    if (rowIndex >= cat.startRow) {
      currentCat = cat.name
    } else {
      break
    }
  }
  return currentCat
}

// ─── Raw row extraction (for AI parsing) ──────────────────────────────────

export function extractRawRows(buffer: Buffer, filename: string): (string | number | null)[][] {
  const ext = filename.toLowerCase().split(".").pop()

  if (ext === "csv") {
    const text = buffer.toString("utf-8")
    const result = Papa.parse(text, { header: false, skipEmptyLines: true, dynamicTyping: false })
    return result.data as (string | number | null)[][]
  }

  const workbook = XLSX.read(buffer, { type: "buffer" })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return []

  const sheet = workbook.Sheets[sheetName]
  return XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1, defval: null })
}

// ─── Fuzzy Matcher ────────────────────────────────────────────────────────

function createFuzzyMatcher() {
  const allAliases: string[] = []
  const aliasToField: Record<string, string> = {}

  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      allAliases.push(alias)
      aliasToField[alias] = field
    }
  }

  return { allAliases, aliasToField, fuse: new Fuse(allAliases, { threshold: 0.45, includeScore: true }) }
}

const matcher = createFuzzyMatcher()

function detectColumn(header: string): { field: string | null; confidence: number } {
  const normalized = header.toLowerCase().trim()

  // Exact match first
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.includes(normalized)) {
      return { field, confidence: 1.0 }
    }
  }

  // Contains check: if header contains an alias as a whole word
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      if (normalized.includes(alias) && alias.length >= 3) {
        return { field, confidence: 0.9 }
      }
    }
  }

  // Fuzzy match
  const results = matcher.fuse.search(normalized)
  if (results.length > 0 && results[0].score !== undefined) {
    const confidence = 1 - results[0].score
    if (confidence > 0.5) {
      return { field: matcher.aliasToField[results[0].item], confidence }
    }
  }

  return { field: null, confidence: 0 }
}

// ─── Main Parse Function ──────────────────────────────────────────────────

export function parseFile(buffer: Buffer, filename: string): ImportPreview {
  const ext = filename.toLowerCase().split(".").pop()
  const isExcel = ext === "xlsx" || ext === "xls"

  if (ext === "csv") {
    return parseCSV(buffer)
  }

  return parseExcel(buffer)
}

function parseCSV(buffer: Buffer): ImportPreview {
  const text = buffer.toString("utf-8")
  const result = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: false })
  const ws = XLSX.utils.json_to_sheet(result.data as Record<string, unknown>[])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, ws, "Sheet1")
  const sheet = workbook.Sheets["Sheet1"]
  const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(sheet, { defval: null })
  const headers = Object.keys(jsonData[0] || {})

  const columns: DetectedColumn[] = headers.map((header) => {
    const { field, confidence } = detectColumn(header)
    const sampleValues = jsonData.slice(0, 5).map((row) => String(row[header] ?? "")).filter(Boolean)
    return { header, mappedField: field, confidence, sampleValues }
  })

  return { columns, rows: jsonData, totalRows: jsonData.length, errors: [], categories: [], headerRowIndex: 0 }
}

function parseExcel(buffer: Buffer): ImportPreview {
  const workbook = XLSX.read(buffer, { type: "buffer" })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return { columns: [], rows: [], totalRows: 0, errors: ["El archivo está vacío"], categories: [], headerRowIndex: 0 }
  }

  const sheet = workbook.Sheets[sheetName]

  // Get raw rows for smart detection
  const rawRows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1, defval: null })
  if (rawRows.length === 0) {
    return { columns: [], rows: [], totalRows: 0, errors: ["El archivo está vacío"], categories: [], headerRowIndex: 0 }
  }

  // Smart header detection
  const headerRowIndex = detectHeaderRow(rawRows)
  const headerRow = rawRows[headerRowIndex]
  if (!headerRow) {
    return { columns: [], rows: [], totalRows: 0, errors: ["No se encontraron encabezados"], categories: [], headerRowIndex: 0 }
  }

  // Extract headers from the detected row (filter out nulls)
  const headers: string[] = []
  const headerIndices: number[] = []
  for (let c = 0; c < headerRow.length; c++) {
    const val = headerRow[c]
    if (val !== null && val !== undefined && val !== "") {
      headers.push(String(val).trim())
      headerIndices.push(c)
    }
  }

  if (headers.length === 0) {
    return { columns: [], rows: [], totalRows: 0, errors: ["No se encontraron encabezados"], categories: [], headerRowIndex: 0 }
  }

  // Extract categories
  const categories = extractCategories(rawRows, headerRowIndex)
  const categoryNames = categories.map((c) => c.name)

  // Build data rows starting from header row + 1
  const dataRows: ParsedRow[] = []
  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const rawRow = rawRows[r]
    if (!rawRow) continue

    // Skip empty rows
    const hasData = rawRow.some((c) => c !== null && c !== undefined && c !== "")
    if (!hasData) continue

    // Skip category separator rows (only col A has text, rest empty)
    const colA = rawRow[0] != null ? String(rawRow[0]).trim() : ""
    const hasOtherData = rawRow.slice(1).some((c) => c !== null && c !== undefined && c !== "")
    if (colA.length >= 3 && !hasOtherData) continue

    // Skip repeated header rows (e.g. "FOTO | DESCRIPCION | STOCK | PRECIO..." inside category sections)
    if (isRepeatedHeaderRow(rawRow)) continue

    // Build ParsedRow using detected headers
    const parsedRow: ParsedRow = { _category: assignCategoryToRow(r, categories) }
    for (let h = 0; h < headers.length; h++) {
      const colIdx = headerIndices[h]
      parsedRow[headers[h]] = rawRow[colIdx] ?? null
    }
    dataRows.push(parsedRow)
  }

  // Detect columns
  const columns: DetectedColumn[] = headers.map((header) => {
    const { field, confidence } = detectColumn(header)
    const sampleValues = dataRows.slice(0, 5).map((row) => String(row[header] ?? "")).filter(Boolean)
    return { header, mappedField: field, confidence, sampleValues }
  })

  return {
    columns,
    rows: dataRows,
    totalRows: dataRows.length,
    errors: [],
    categories: categoryNames,
    headerRowIndex,
  }
}

// ─── Row Mapping ──────────────────────────────────────────────────────────

export function mapRows(rows: ParsedRow[], columns: DetectedColumn[]): { mapped: MappedRow[]; errors: string[] } {
  const mapped: MappedRow[] = []
  const errors: string[] = []

  const fieldMap: Record<string, string> = {}
  for (const col of columns) {
    if (col.mappedField) {
      fieldMap[col.header] = col.mappedField
    }
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2 // Excel row number (1-indexed + header)

    // Extract name (required)
    const name = extractName(row, fieldMap)
    if (!name) {
      errors.push(`Fila ${rowNum}: falta el nombre del producto`)
      continue
    }

    // Extract price (required)
    const price = extractPrice(row, fieldMap)
    if (price === null || price <= 0) {
      errors.push(`Fila ${rowNum}: precio inválido o faltante`)
      continue
    }

    const category = row._category as string | null

    mapped.push({
      name,
      price,
      costPrice: extractCostPrice(row, fieldMap),
      sku: extractSku(row, fieldMap),
      stock: extractStock(row, fieldMap),
      unidadBase: extractUnidadBase(row, fieldMap),
      description: extractDescription(row, fieldMap),
      isActive: extractIsActive(row, fieldMap),
      featured: extractFeatured(row, fieldMap),
      isWholesale: extractIsWholesale(row, fieldMap),
      wholesalePrice: extractWholesalePrice(row, fieldMap),
      wholesaleLabel: extractWholesaleLabel(row, fieldMap),
      categoryId: null, // Will be resolved by caller
      category,
    })
  }

  return { mapped, errors }
}

function getFieldValue(row: ParsedRow, fieldMap: Record<string, string>, targetField: string): string | number | boolean | null {
  for (const [header, mappedField] of Object.entries(fieldMap)) {
    if (mappedField === targetField) {
      return row[header] ?? null
    }
  }
  return null
}

function extractName(row: ParsedRow, fieldMap: Record<string, string>): string | null {
  const v = getFieldValue(row, fieldMap, "name")
  return safeStr(v, 200, 1)
}

function extractPrice(row: ParsedRow, fieldMap: Record<string, string>): number | null {
  const v = getFieldValue(row, fieldMap, "price")
  return safeFloat(v, 1_000_000, 0.01)
}

function extractCostPrice(row: ParsedRow, fieldMap: Record<string, string>): number | null {
  const v = getFieldValue(row, fieldMap, "costPrice")
  return safeFloat(v, 1_000_000, 0)
}

function extractSku(row: ParsedRow, fieldMap: Record<string, string>): string | null {
  const v = getFieldValue(row, fieldMap, "sku")
  return safeStr(v, 32, 1)
}

function extractStock(row: ParsedRow, fieldMap: Record<string, string>): number {
  const v = getFieldValue(row, fieldMap, "stock")
  return safeInt(v, 1_000_000, 0) ?? 0
}

function extractUnidadBase(row: ParsedRow, fieldMap: Record<string, string>): string {
  const v = getFieldValue(row, fieldMap, "unidadBase")
  return safeStr(v, 50, 1) ?? "Unidad"
}

function extractDescription(row: ParsedRow, fieldMap: Record<string, string>): string | null {
  const v = getFieldValue(row, fieldMap, "description")
  return safeStr(v, 5000, 0)
}

function extractIsActive(row: ParsedRow, fieldMap: Record<string, string>): boolean {
  const v = getFieldValue(row, fieldMap, "isActive")
  if (v === null || v === undefined || v === "") return true
  return safeBool(v)
}

function extractFeatured(row: ParsedRow, fieldMap: Record<string, string>): boolean {
  const v = getFieldValue(row, fieldMap, "featured")
  if (v === null || v === undefined || v === "") return false
  return safeBool(v)
}

function extractIsWholesale(row: ParsedRow, fieldMap: Record<string, string>): boolean {
  const v = getFieldValue(row, fieldMap, "isWholesale")
  if (v === null || v === undefined || v === "") return false
  return safeBool(v)
}

function extractWholesalePrice(row: ParsedRow, fieldMap: Record<string, string>): number | null {
  const v = getFieldValue(row, fieldMap, "wholesalePrice")
  return safeFloat(v, 1_000_000, 0)
}

function extractWholesaleLabel(row: ParsedRow, fieldMap: Record<string, string>): string | null {
  const v = getFieldValue(row, fieldMap, "wholesaleLabel")
  return safeStr(v, 100, 1)
}
