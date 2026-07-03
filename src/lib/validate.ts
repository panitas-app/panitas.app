const MAX_NAME = 200
const MAX_DESCRIPTION = 5000
const MAX_SHORT = 500
const MAX_URL = 2048
const MAX_PRICE = 1_000_000
const MAX_STOCK = 1_000_000
const MAX_WHOLESCALE = 100
const MAX_SIZES = 100
const MAX_IMAGES = 20

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

export function safeStr(v: unknown, max: number = MAX_SHORT, min: number = 0): string | null {
  if (v === undefined || v === null) return null
  if (typeof v !== "string") return undefined as any
  const trimmed = v.trim()
  if (trimmed.length < min) return undefined as any
  return trimmed.slice(0, max)
}

export function requireStr(v: unknown, max: number, min: number = 1): string | undefined {
  if (typeof v !== "string") return undefined
  const trimmed = v.trim()
  if (trimmed.length < min || trimmed.length > max) return undefined
  return trimmed
}

export function safeFloat(v: unknown, max: number = MAX_PRICE, min: number = 0): number | null {
  if (v === undefined || v === null || v === "") return null
  const n = typeof v === "number" ? v : parseFloat(String(v))
  if (!Number.isFinite(n)) return null
  if (n < min || n > max) return null
  return n
}

export function safeInt(v: unknown, max: number = MAX_STOCK, min: number = 0): number | null {
  if (v === undefined || v === null || v === "") return null
  const n = typeof v === "number" ? v : parseInt(String(v), 10)
  if (!Number.isFinite(n)) return null
  if (!Number.isInteger(n)) return null
  if (n < min || n > max) return null
  return n
}

export function safeBool(v: unknown): boolean {
  return v === true || v === "true" || v === 1 || v === "1"
}

export function safeUrl(v: unknown, max: number = MAX_URL): string | null {
  const s = safeStr(v, max)
  if (!s) return null
  try {
    const u = new URL(s)
    if (!["http:", "https:", "data:"].includes(u.protocol)) return null
    return s
  } catch {
    return null
  }
}

export function safeSlug(v: unknown): string | null {
  if (typeof v !== "string") return null
  const cleaned = v.trim().toLowerCase()
  if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(cleaned)) return null
  return cleaned
}

export function safeStringArray(v: unknown, maxItems: number = MAX_SIZES, itemMax: number = 100): string[] | null {
  if (v === undefined || v === null) return null
  if (!Array.isArray(v)) return null
  if (v.length > maxItems) return null
  const out: string[] = []
  for (const item of v) {
    if (typeof item !== "string") return null
    const trimmed = item.trim().slice(0, itemMax)
    if (trimmed.length === 0) return null
    out.push(trimmed)
  }
  return out
}

export function safeImages(v: unknown): string[] | null {
  if (v === undefined || v === null) return null
  let arr: unknown
  if (typeof v === "string") {
    try { arr = JSON.parse(v) } catch { return null }
  } else if (Array.isArray(v)) {
    arr = v
  } else {
    return null
  }
  if (!Array.isArray(arr) || arr.length > MAX_IMAGES) return null
  const out: string[] = []
  for (const item of arr) {
    if (typeof item !== "string") return null
    if (!safeUrl(item)) return null
    out.push(item)
  }
  return out
}

export function safeColor(v: unknown): string | null {
  if (typeof v !== "string") return null
  const c = v.trim()
  if (!/^#[0-9a-fA-F]{3,8}$/.test(c)) return null
  return c
}

export function safePlan(v: unknown): "free" | "basic" | "advanced" {
  if (v === "free" || v === "basic" || v === "advanced") return v
  return "free"
}

export const LIMITS = { MAX_NAME, MAX_DESCRIPTION, MAX_SHORT, MAX_URL, MAX_PRICE, MAX_STOCK, MAX_WHOLESCALE, MAX_SIZES, MAX_IMAGES }
