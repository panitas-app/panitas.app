/**
 * Reglas y catálogo del Business Memory Engine (FASE 5G).
 *
 * Aquí vive el conocimiento declarativo del aprendizaje:
 *
 *   - Configuración por defecto de aprendizaje (umbrales por tipo).
 *   - Detección de dominio del negocio desde el texto/intento.
 *   - Extracción de señales de aprendizaje (terminología, preferencias,
 *     reglas operativas, patrones de uso) a partir de lo que dice el usuario.
 *
 * La extracción es determinista y conservadora: una frase ambigua NO produce
 * un recuerdo confirmado (las señales no explícitas pasan por el umbral).
 */
import type { BusinessMemoryKind, BusinessMemoryObservation, LearningConfig } from "./memory-types"
import type { MemoryContext, MemoryImportance } from "@/lib/agent/memory"

export const DEFAULT_LEARNING_CONFIG: LearningConfig = {
  enabled: true,
  thresholds: {
    terminology: 3,
    preference: 3,
    operational_rule: 2,
    usage_pattern: 4,
  },
  candidateTtlMs: 7 * 24 * 60 * 60 * 1000,
  maxCandidates: 50,
  maxMemories: 200,
}

// ─── Dominios del negocio ──────────────────────────────────────────────────────

export const DOMAIN_KEYWORDS: Record<string, string[]> = {
  ventas: ["venta", "ventas", "vendi", "vendido", "vendimos", "vendiste", "facturas"],
  inventario: ["inventario", "stock", "producto", "productos", "agotado", "existencias", "existencia"],
  clientes: ["cliente", "clientes", "paciente", "pacientes"],
  finanzas: ["caja", "gasto", "gastos", "pago", "pagos", "ingreso", "ingresos", "moneda", "dinero"],
  proveedores: ["proveedor", "proveedores", "compras", "compra"],
  pedidos: ["pedido", "pedidos", "orden", "ordenes", "encargo", "encargos"],
}

/** Dominios de la capa de inteligencia (4A) → dominios del negocio (5G). */
const DOMAIN_BY_INTENT_ID: Record<string, string> = {
  sales: "ventas",
  inventory: "inventario",
  customers: "clientes",
  orders: "pedidos",
}

function stripAccents(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
}

export function detectDomain(message: string, intent?: string, domains?: string[]): string | null {
  if (domains && domains.length > 0) {
    for (const domain of domains) {
      const mapped = DOMAIN_BY_INTENT_ID[domain.toLowerCase()]
      if (mapped) return mapped
    }
  }
  if (intent) {
    const normalized = intent.toLowerCase()
    if (normalized.includes("venta")) return "ventas"
    if (normalized.includes("inventario") || normalized.includes("stock") || normalized.includes("product")) return "inventario"
    if (normalized.includes("cliente") || normalized.includes("customer")) return "clientes"
    if (normalized.includes("finanz") || normalized.includes("gasto")) return "finanzas"
    if (normalized.includes("proveedor") || normalized.includes("supplier")) return "proveedores"
    if (normalized.includes("pedido") || normalized.includes("order")) return "pedidos"
  }

  const text = ` ${stripAccents(message)} `
  const found = Object.entries(DOMAIN_KEYWORDS).find(([, words]) =>
    words.some((word) => text.includes(stripAccents(word)))
  )
  return found?.[0] ?? null
}

// ─── Señales de aprendizaje ────────────────────────────────────────────────────

export interface LearningSignal {
  kind: BusinessMemoryKind
  key: string
  label: string
  value: unknown
  tags: string[]
  domain?: string
  explicit: boolean
  importance?: MemoryImportance
}

const TERMINOLOGY_PATTERNS: RegExp[] = [
  // "llamo pacientes a mis clientes" / "llámale cliente a los pacientes"
  /\b(?:llamo|llamamos|llamas|llama|llámale|llámalo|llámales|llamar)\b\s+(?:a\s+)?["']?([a-záéíóúñü]+)["']?\s+(?:a|a los|a las|al|a la|como|por)\s+(?:(?:los|las|el|la|mis|tus|sus|a)\s+)?["']?([a-záéíóúñü]+)["']?/i,
  // "me refiero a pacientes como clientes"
  /\b(?:me refiero|referirme|referirnos)\b\s+(?:a|a los|a las)\s+["']?([a-záéíóúñü]+)["']?\s+(?:como|por)\s+["']?([a-záéíóúñü]+)["']?/i,
]

export function extractTerminologySignal(message: string): LearningSignal | null {
  const text = stripAccents(message)
  for (const pattern of TERMINOLOGY_PATTERNS) {
    const match = text.match(pattern)
    if (!match) continue
    const term = match[1].toLowerCase()
    const standard = match[2].toLowerCase()
    if (!term || !standard || term === standard) continue
    return {
      kind: "terminology",
      key: `bm.terminology.${standard}`,
      label: `Usas "${term}" para referirte a "${standard}"`,
      value: { term, standard },
      tags: ["terminology", term, standard],
      domain: detectDomain(message) ?? undefined,
      explicit: true,
      importance: "HIGH",
    }
  }
  return null
}

const CURRENCY_INTENT = /\b(?:moneda|divisa|prefiero|preferimos|prefieres|trabajo|trabajamos|manejo|manejamos|uso|usamos|facturamos|operamos|opero)\b/i

const CURRENCY_MENTIONS: Array<{ value: string; label: string; regex: RegExp }> = [
  { value: "USD", label: "dólares (USD)", regex: /\b(dólares?|dolar(es)?|usd|dólares americanos)\b/i },
  { value: "Bs", label: "bolívares (Bs)", regex: /\b(bolívares?|bolivar(es)?|bss|bs\.|bs)\b/i },
]

export function extractCurrencySignal(message: string): LearningSignal | null {
  if (!CURRENCY_INTENT.test(message)) return null
  const match = CURRENCY_MENTIONS.find((c) => c.regex.test(message))
  if (!match) return null
  return {
    kind: "preference",
    key: "bm.preference.currency",
    label: `Moneda principal: ${match.label}`,
    value: { currency: match.value },
    tags: ["moneda", "currency", "divisa", match.value.toLowerCase()],
    domain: "finanzas",
    explicit: true,
    importance: "HIGH",
  }
}

const RULE_PATTERNS: Array<{ key: string; label: string; value: unknown; regex: RegExp; domain?: string }> = [
  {
    key: "bm.operational_rule.no_sell_without_stock",
    label: "No vender sin stock suficiente",
    value: { rule: "No vender sin stock suficiente" },
    regex: /\b(?:no|nunca|prohibido|prohibida|evitar)\s+(?:vender|venderle|venderles|despachar)\s+(?:si|sin|cuando|con)?\s*(?:no|poco|sin|sin)\s*stock/i,
    domain: "inventario",
  },
  {
    key: "bm.operational_rule.confirm_before_delete",
    label: "Confirmar antes de eliminar registros",
    value: { rule: "Confirmar antes de eliminar registros" },
    regex: /\b(?:confirmar|confirma|confirmar siempre|siempre confirmar)\s+(?:antes\s+de|cuando|al)?\s*(?:eliminar|borrar|elimines|borres)/i,
  },
  {
    key: "bm.operational_rule.ask_customer_on_sale",
    label: "Solicitar datos del cliente en cada venta",
    value: { rule: "Solicitar datos del cliente en cada venta" },
    regex: /\b(?:siempre|pedir|solicitar|pide|solicita)\s+(?:pide|solicita|pedir|solicitar)?\s*(?:los\s+)?datos?\s+(?:del|al|de los)\s+cliente/i,
    domain: "clientes",
  },
  {
    key: "bm.operational_rule.favorite_payment",
    label: "Método de pago preferido",
    value: { rule: "Usar el método de pago preferido por defecto" },
    regex: /\b(?:siempre|prefiero|preferimos)\s+(?:cobrar|pagar|recibir)\s+(?:en|con|por)\s+/i,
    domain: "finanzas",
  },
]

export function extractRuleSignal(message: string): LearningSignal | null {
  for (const rule of RULE_PATTERNS) {
    if (rule.regex.test(message)) {
      return {
        kind: "operational_rule",
        key: rule.key,
        label: rule.label,
        value: rule.value,
        tags: ["regla", "rule", rule.key.split(".").pop() ?? "rule"],
        domain: rule.domain,
        explicit: true,
        importance: "HIGH",
      }
    }
  }
  return null
}

export function extractUsageSignal(message: string, intent?: string, domains?: string[]): LearningSignal | null {
  const domain = detectDomain(message, intent, domains)
  if (!domain) return null
  return {
    kind: "usage_pattern",
    key: `bm.usage_pattern.${domain}`,
    label: `Consultas frecuentes: ${domain}`,
    value: { domain },
    tags: [domain, "uso", "consulta"],
    domain,
    explicit: false,
    importance: "MEDIUM",
  }
}

/** Extrae todas las señales de aprendizaje de un turno. */
export function extractSignals(message: string, intent?: string, domains?: string[]): LearningSignal[] {
  const signals = [
    extractTerminologySignal(message),
    extractCurrencySignal(message),
    extractRuleSignal(message),
    extractUsageSignal(message, intent, domains),
  ].filter((s): s is LearningSignal => s !== null)
  return signals
}

/** Convierte una señal en la observación que consume el learner. */
export function toObservation(signal: LearningSignal, ctx: MemoryContext): BusinessMemoryObservation {
  return {
    ctx,
    kind: signal.kind,
    key: signal.key,
    label: signal.label,
    value: signal.value,
    tags: signal.tags,
    domain: signal.domain,
    explicit: signal.explicit,
    importance: signal.importance,
  }
}
