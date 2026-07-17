import * as XLSX from "xlsx"
import Fuse from "fuse.js"
import Papa from "papaparse"
import { safeStr, safeFloat, safeInt, safeBool } from "./validate"

// Known product field names (Spanish + English aliases)
export const FIELD_ALIASES: Record<string, string[]> = {
  name: ["nombre", "producto", "name", "product", "articulo", "artículo", "descripcion", "descripción", "description"],
  price: ["precio", "price", "venta", "pvp", "pvp usd", "precio venta"],
  costPrice: ["costo", "cost", "costo usd", "precio costo", "cost price", "costo unitario"],
  sku: ["sku", "codigo", "código", "code", "cod", "ref", "referencia"],
  stock: ["stock", "cantidad", "qty", "quantity", "inventario", "existencias", "disponible"],
  unidadBase: ["unidad", "unit", "medida", "um", "unidad base", "unid"],
  description: ["detalle", "detalles", "info", "informacion", "información", "obs", "observaciones"],
  isActive: ["activo", "active", "estado", "habilitado", "disponible"],
  featured: ["destacado", "featured", "promocion", "promoción"],
  isWholesale: ["mayorista", "wholesale", "mayoreo"],
  wholesalePrice: ["precio mayorista", "wholesale price", "precio mayoreo"],
  wholesaleLabel: ["etiqueta mayorista", "wholesale label", "minimo mayoreo"],
  categoryId: ["categoria", "categoría", "category", "cat", "grupo"],
}

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
}

// Fuzzy matcher for column headers
function createFuzzyMatcher() {
  const allAliases: string[] = []
  const aliasToField: Record<string, string> = {}

  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      allAliases.push(alias)
      aliasToField[alias] = field
    }
  }

  return { allAliases, aliasToField, fuse: new Fuse(allAliases, { threshold: 0.4, includeScore: true }) }
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

export function parseFile(buffer: Buffer, filename: string): ImportPreview {
  const ext = filename.toLowerCase().split(".").pop()
  let workbook: XLSX.WorkBook

  if (ext === "csv") {
    // Parse CSV with papaparse
    const text = buffer.toString("utf-8")
    const result = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: false })
    const ws = XLSX.utils.json_to_sheet(result.data as Record<string, unknown>[])
    workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, ws, "Sheet1")
  } else {
    // Parse Excel
    workbook = XLSX.read(buffer, { type: "buffer" })
  }

  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return { columns: [], rows: [], totalRows: 0, errors: ["El archivo está vacío"] }
  }

  const sheet = workbook.Sheets[sheetName]
  const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(sheet, { defval: null })
  const headers = Object.keys(jsonData[0] || {})

  // Detect columns
  const columns: DetectedColumn[] = headers.map((header) => {
    const { field, confidence } = detectColumn(header)
    const sampleValues = jsonData.slice(0, 5).map((row) => String(row[header] ?? "")).filter(Boolean)
    return { header, mappedField: field, confidence, sampleValues }
  })

  return {
    columns,
    rows: jsonData,
    totalRows: jsonData.length,
    errors: [],
  }
}

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
