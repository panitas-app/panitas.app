/**
 * Conversational AI Copilot (FASE 7B) — Detección de intención.
 *
 * Clasifica el último turno del cliente con varias intenciones posibles a la
 * vez (multi-intención): "¿cuánto cuesta la camisa negra talla M?" activa
 * `precio` y `disponibilidad`. También detecta la intención de una consulta
 * en lenguaje natural ("¿cuánto debe este cliente?"). Implementación
 * determinista (sin red) con normalización de tildes; lista para que un
 * proveedor LLM la enriquezca después.
 */
import type { InboxMessageDTO } from "@/lib/inbox/conversation-types"
import type {
  CopilotConfidence,
  CopilotIntent,
  CopilotIntentDetection,
  CopilotQueryIntent,
  InboxSentiment,
} from "./conversation-types"
import { COPILOT_INTENTS } from "./conversation-types"

export type { CopilotIntentDetection }

const STOPWORDS = new Set([
  "para", "esta", "este", "pero", "como", "cuando", "porque", "entonces", "también", "ademas",
  "usted", "ellos", "ellas", "entre", "estas", "quiero", "puedo", "puede", "saber", "ver",
  "cliente", "negocio", "favor", "puedes", "podria", "gracias", "muchas", "buenos", "buenas",
  "hola", "buenas", "tardes", "dias", "noche", "tengo", "hacer", "saber", "queria",
])

const INTENT_KEYWORDS: Record<Exclude<CopilotIntent, "otro">, string[]> = {
  consulta_producto: ["producto", "tienen", "venden", "modelo", "marca", "referencia", "catalogo", "variedad"],
  disponibilidad: ["disponible", "stock", "hay", "tienen talla", "talla", "agotado", "queda", "cuantas unidades", "tienen en"],
  precio: ["precio", "cuanto cuesta", "cuanto vale", "costo", "valor", "cuanto cobran", "cuanto es", "a cuanto", "oferta", "promocion", "descuento"],
  cotizacion: ["cotizacion", "cotiza", "presupuesto", "lista de precios", "mayor", "por mayor", "wholesale", "factura", "facturar"],
  pedido: ["pedido", "orden", "entrega", "envio", "seguimiento", "guia", "estado de mi pedido", "cuando llega", "demora", "cuando llegan"],
  cobranza: ["debo", "pago", "cuota", "abono", "vencido", "saldo", "deuda", "recibo", "resta", "cuanto debo", "facilidades", "fiado"],
  soporte: ["problema", "error", "no funciona", "ayuda", "configurar", "no puedo", "falla", "cuenta", "asistencia", "revisar", "recuperar"],
  garantia: ["garantia", "cambio", "reemplazo", "reparacion", "reembolso", "devolucion", "defectuoso", "roto", "dano", "vencio la garantia"],
  reclamo: ["queja", "reclamo", "mal servicio", "no llego", "no me gusto", "estoy molesto", "furioso", "que pasa", "exijo", "demora demasiado"],
  agendar_visita: ["visita", "cita", "agendar", "agenda", "reservar", "horario para", "cuando puedo ir", "quede de pasar", "apartar"],
  venta: ["comprar", "quiero comprar", "vender", "pedir", "encargar", "apartar", "reservar", "cuanto por", "me llevo"],
}

const NEGATIVE_WORDS = ["mal", "no llego", "no me gusto", "queja", "reclamo", "error", "problema", "no funciona", "falla", "devolver", "tardo", "nunca", "defectuoso", "furioso", "molesto"]
const POSITIVE_WORDS = ["gracias", "perfecto", "excelente", "me encanta", "genial", "me gusta", "super", "buenisimo", "muy bien", "encantado"]

const QUERY_KEYWORDS: Record<Exclude<CopilotQueryIntent, "otro">, string[]> = {
  compras: ["que ha comprado", "compras", "ha comprado", "historial", "ha pedido", "compro", "historial de compras", "que me ha"],
  deuda: ["cuanto debe", "debe", "deuda", "saldo", "cuotas", "por pagar", "fiado", "vencido", "adeuda"],
  ultima_compra: ["ultima compra", "ultimo pedido", "cuando compro", "compro por ultima", "ultima vez"],
  pedidos_pendientes: ["pedidos pendientes", "pendientes", "en camino", "por entregar", "sin pagar", "pedidos activos", "tiene pedidos"],
  productos_frecuentes: ["suele comprar", "frecuenta", "favorito", "favoritos", "prefiere", "que productos compra", "habitualmente", "siempre compra"],
  inventario: ["stock de", "disponible", "cuanto hay de", "hay de", "tienen", "inventario", "existencias", "en stock"],
  cliente: ["quien es", "cliente", "telefono", "datos", "ficha", "informacion del", "tiene nota", "notas del"],
}

/** Normaliza a minúsculas y sin tildes para robustez del matching. */
function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

function customerText(messages: InboxMessageDTO[]): string {
  return messages
    .filter((m) => m.sender === "customer")
    .map((m) => m.content)
    .join(" \n ")
}

function countHits(text: string, keywords: string[]): number {
  const lower = normalize(text)
  return keywords.reduce((acc, k) => (lower.includes(k) ? acc + 1 : acc), 0)
}

function detectSentiment(messages: InboxMessageDTO[]): InboxSentiment {
  const text = normalize(customerText(messages))
  const negative = NEGATIVE_WORDS.filter((w) => text.includes(w)).length
  const positive = POSITIVE_WORDS.filter((w) => text.includes(w)).length
  if (negative > positive) return "negative"
  if (positive > negative) return "positive"
  return "neutral"
}

function extractTopics(messages: InboxMessageDTO[]): string[] {
  const counts = new Map<string, number>()
  for (const message of messages) {
    if (message.sender !== "customer") continue
    const words = normalize(message.content)
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 5 && !STOPWORDS.has(w))
    for (const word of words) {
      counts.set(word, (counts.get(word) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word)
}

/** Detecta todas las intenciones presentes en el turno (multi-intención). */
export function detectConversationIntent(messages: InboxMessageDTO[]): CopilotIntentDetection {
  const text = customerText(messages)
  const scores = new Map<CopilotIntent, string[]>()
  for (const intent of COPILOT_INTENTS) {
    if (intent === "otro") continue
    const keywords = INTENT_KEYWORDS[intent]
    const hits = keywords.filter((k) => normalize(text).includes(k))
    if (hits.length > 0) {
      scores.set(intent, hits)
    }
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1].length - a[1].length)
  const intents = ranked.slice(0, 3).map(([intent]) => intent)
  const primaryIntent: CopilotIntent = intents[0] ?? "otro"
  const bestScore = ranked[0]?.[1].length ?? 0
  const confidence: CopilotConfidence = bestScore >= 3 ? "high" : bestScore === 2 ? "medium" : "low"
  const signals: Partial<Record<CopilotIntent, string[]>> = Object.fromEntries(ranked.map(([i, ks]) => [i, ks.slice(0, 4)]))

  return {
    intents,
    primaryIntent,
    sentiment: detectSentiment(messages),
    topics: extractTopics(messages),
    confidence,
    signals,
  }
}

/** Detecta la intención de una consulta del usuario en lenguaje natural. */
export function detectQueryIntent(question: string): CopilotQueryIntent {
  const text = normalize(question)
  let best: CopilotQueryIntent = "otro"
  let bestScore = 0
  for (const key of Object.keys(QUERY_KEYWORDS) as Exclude<CopilotQueryIntent, "otro">[]) {
    const score = countHits(text, QUERY_KEYWORDS[key])
    if (score > bestScore) {
      best = key
      bestScore = score
    }
  }
  return best
}
