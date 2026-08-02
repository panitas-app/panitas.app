/**
 * Memory Classifier (FASE 3D).
 *
 * Decide determinísticamente (sin ML, sin llamadas al modelo) qué información vale
 * la pena guardar y con qué importancia. Reglas:
 *
 *   - Señales de preferencia  → kind `preference`, HIGH.
 *   - Señales de identidad negocio → kind `fact`, HIGH.
 *   - Señales de cliente      → kind `customer`, HIGH.
 *   - Señales de producto     → kind `product`, MEDIUM.
 *   - Señales de settings     → kind `business_setting`, HIGH.
 *   - Señales de evento/alerta → kind `event`, HIGH (CRITICAL si es stock agotado).
 *   - Sin señal relevante (small talk / preguntas operativas genéricas) → no guardar.
 *
 * La importancia define la expiración (MEMORY_IMPORTANCE_TTL_MS): LOW=1d, MEDIUM=7d,
 * HIGH=30d, CRITICAL=persistente.
 */
import {
  MEMORY_IMPORTANCE_TTL_MS,
  type MemoryClassifyInput,
  type MemoryClassifyResult,
  type MemoryImportance,
  type MemoryKind,
  type MemoryType,
} from "./types"

/** Señales → (kind, importancia base). Las preferencias/identidad pesan más. */
const KIND_SIGNALS: Array<{ regex: RegExp; kind: MemoryKind; importance: MemoryImportance }> = [
  { regex: /\b(prefiero|preferiría|me gusta|no me gusta|quiero|necesito|usar|usamos|uso)\b/i, kind: "preference", importance: "HIGH" },
  { regex: /\b(mi negocio|mi tienda|mi emprendimiento|vendemos|vendo|trabajo con|somos|nos dedicamos|mi local)\b/i, kind: "fact", importance: "HIGH" },
  { regex: /\b(cliente|clientes|contacto|teléfono|telefono|celular)\b/i, kind: "customer", importance: "HIGH" },
  { regex: /\b(producto|productos|artículo|articulo|sku|categoría|categoria)\b/i, kind: "product", importance: "MEDIUM" },
  { regex: /\b(horario|precio|precios|dirección|direccion|abrimos|cerramos|costo|envío|envio|whatsapp|instagram)\b/i, kind: "business_setting", importance: "HIGH" },
  { regex: /\b(stock|agotado|alerta|vencido|vencimiento|pendiente|pedido|pedidos)\b/i, kind: "event", importance: "HIGH" },
]

const CRITICAL_PATTERNS = [
  /\bagotado\b|\b(?:stock|unidades?)\s*[:=]?\s*0\b|\b0\s*(?:unidades?|stock)\b/i,
  /\bvencimiento\b.*\bmañana\b|\bmañana\b.*\bvencimiento\b/i,
]

const BUSINESS_TYPE_KINDS: MemoryKind[] = ["business_setting", "customer", "product"]

/** Tamaño mínimo/ máximo para considerar que el texto merece guardarse. */
const MIN_LENGTH = 8
const MAX_LENGTH = 600

function normalizeContent(content: string): string {
  return content.trim().replace(/\s+/g, " ")
}

const SIGNAL_IMPORTANCE: Record<MemoryImportance, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }

export function importanceFromSignals(content: string): { kind: MemoryKind; importance: MemoryImportance } {
  let best: { kind: MemoryKind; importance: MemoryImportance } | null = null
  for (const signal of KIND_SIGNALS) {
    if (signal.regex.test(content)) {
      // A igual importancia gana la primera señal (las más específicas van primero).
      if (!best || SIGNAL_IMPORTANCE[signal.importance] > SIGNAL_IMPORTANCE[best.importance]) {
        best = { kind: signal.kind, importance: signal.importance }
      }
    }
  }
  if (!best) return { kind: "custom", importance: "MEDIUM" }

  let importance = best.importance
  if (CRITICAL_PATTERNS.some((re) => re.test(content))) importance = "CRITICAL"
  return { kind: best.kind, importance }
}

export function typeForKind(kind: MemoryKind): MemoryType {
  if (kind === "event") return "short_term"
  if (kind === "preference") return "long_term"
  if (BUSINESS_TYPE_KINDS.includes(kind)) return "business"
  return "long_term"
}

export function expiresForImportance(importance: MemoryImportance): string | null {
  const ttl = MEMORY_IMPORTANCE_TTL_MS[importance]
  if (ttl === null) return null
  return new Date(Date.now() + ttl).toISOString()
}

/** Clave estable para un hecho extraído: kind + hash del contenido normalizado. */
export function keyForContent(content: string): string {
  const normalized = normalizeContent(content).toLowerCase()
  return `${kindHint(normalized)}:${hashString(normalized)}`
}

function kindHint(content: string): string {
  for (const signal of KIND_SIGNALS) {
    if (signal.regex.test(content)) return signal.kind
  }
  return "fact"
}

function hashString(input: string): string {
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i)
  }
  return (hash >>> 0).toString(36)
}

export class MemoryClassifier {
  classify(input: MemoryClassifyInput): MemoryClassifyResult {
    const content = normalizeContent(input.content ?? "")
    if (content.length < MIN_LENGTH || content.length > MAX_LENGTH) {
      return { shouldStore: false, importance: "LOW", type: "long_term", kind: "custom" }
    }

    const { kind, importance } = importanceFromSignals(content)

    // Sin señal relevante (small talk / preguntas operativas genéricas) → no guardar.
    if (kind === "custom") {
      return { shouldStore: false, importance: "LOW", type: "long_term", kind: "custom" }
    }

    // Las alertas (agotado/vencimiento) son hechos transitorios del negocio.
    const effectiveKind: MemoryKind = importance === "CRITICAL" ? "event" : kind
    const type = typeForKind(effectiveKind)
    const value = content

    return {
      shouldStore: true,
      importance,
      type,
      kind: effectiveKind,
      key: keyForContent(content),
      value,
      expiresAt: expiresForImportance(importance),
    }
  }
}
