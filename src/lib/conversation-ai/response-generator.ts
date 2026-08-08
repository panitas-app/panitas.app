/**
 * Conversational AI Copilot (FASE 7B) — Respuestas sugeridas.
 *
 * Genera entre una y tres respuestas sugeridas para el último turno del
 * cliente. Las respuestas se anclan en datos REALES del negocio (inventario,
 * CRM, créditos, pedidos) y nunca inventan información: si no hay datos,
 * se marca `grounded: false`. El usuario decide editar y enviar.
 */
import type { InboxMessageDTO } from "@/lib/inbox/conversation-types"
import type {
  CopilotCustomerContext,
  CopilotIntent,
  CopilotIntentDetection,
  CopilotMemory,
  CopilotProductHit,
  CopilotSuggestion,
  CopilotTone,
} from "./conversation-types"

export interface ResponseGeneratorInput {
  intent: CopilotIntentDetection
  messages: InboxMessageDTO[]
  context: CopilotCustomerContext | null
  memory: CopilotMemory | null
  /** Productos reales que coinciden con el último mensaje del cliente. */
  inventoryHits: CopilotProductHit[]
  customerName: string | null
}

export interface GeneratedSuggestions {
  suggestions: CopilotSuggestion[]
}

function fmtMoney(value: number): string {
  return value.toLocaleString("es-EC", { style: "currency", currency: "USD" })
}

function greeting(name: string | null, tone: CopilotTone): string {
  const base = name?.trim() || "estimado cliente"
  if (tone === "formal") return `Estimado/a ${base},`
  if (tone === "amable") return `¡Hola ${base}!`
  return `Hola ${base},`
}

function toneOf(memory: CopilotMemory | null): CopilotTone {
  return memory?.tone ?? "amable"
}

function suggestion(text: string, rationale: string, dataSources: string[], grounded: boolean): CopilotSuggestion {
  return { text, rationale, dataSources, grounded }
}

function has(intent: CopilotIntentDetection, kind: CopilotIntent): boolean {
  return intent.intents.includes(kind)
}

function mentionProduct(text: string, hits: CopilotProductHit[]): CopilotProductHit | null {
  const lower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  return hits.find((h) => lower.includes(h.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))) ?? hits[0] ?? null
}

/** Genera 1-3 respuestas sugeridas basadas en datos reales. */
export function generateResponseSuggestions(input: ResponseGeneratorInput): CopilotSuggestion[] {
  const { intent, messages, context, memory, inventoryHits, customerName } = input
  const tone = toneOf(memory)
  const saludo = greeting(customerName, tone)
  const lastCustomer = [...messages].reverse().find((m) => m.sender === "customer")?.content ?? ""
  const suggestions: CopilotSuggestion[] = []

  const product = mentionProduct(lastCustomer, inventoryHits)

  // Precio / disponibilidad / cotización / consulta de producto → inventario real.
  if ((has(intent, "precio") || has(intent, "disponibilidad") || has(intent, "cotizacion") || has(intent, "consulta_producto")) && product) {
    const availability = product.stock > 0 ? `Tenemos ${product.stock} unidad(es) disponible(s)` : "Este producto está agotado por ahora"
    suggestions.push(
      suggestion(
        `${saludo} sobre ${product.name}: su precio es ${fmtMoney(product.price)}. ${availability}. ¿Te ayudo a apartarlo o lo incluimos en tu pedido?`,
        `Respuesta anclada en el inventario real de "${product.name}".`,
        ["inventario:precio", "inventario:stock"],
        true,
      ),
    )
  }

  // Cobranza → deuda real del cliente.
  if (has(intent, "cobranza") && context && context.totalDebt > 0) {
    const detail =
      context.credits.overdueAmount > 0
        ? `tienes ${fmtMoney(context.credits.overdueAmount)} vencido(s)`
        : `tienes ${fmtMoney(context.credits.pendingAmount)} por pagar en tu crédito`
    suggestions.push(
      suggestion(
        `${saludo} revisé tu cuenta y ${detail}. ¿Te gustaría realizar un abono hoy? Te acompaño con el proceso.`,
        "Usa el saldo real pendiente/vencido del cliente.",
        ["creditos:pendiente", "creditos:vencido"],
        true,
      ),
    )
  }

  // Pedido → estado real de los pedidos.
  if (has(intent, "pedido") && context && context.orders.length > 0) {
    const relevant = context.pendingOrders[0] ?? context.orders[0]
    suggestions.push(
      suggestion(
        `${saludo} déjame verificarte el pedido ${relevant.orderNumber}. Actualmente está "${relevant.status}" y el total fue ${fmtMoney(relevant.total)}. Te confirmo cualquier novedad en seguida.`,
        `Usa el pedido real ${relevant.orderNumber} del cliente.`,
        ["pedidos:estado"],
        true,
      ),
    )
  }

  // Reclamo / garantía → disculpa + paso concreto.
  if (has(intent, "reclamo") || has(intent, "garantia")) {
    suggestions.push(
      suggestion(
        `${saludo} lamento lo sucedido. Voy a revisar tu caso de inmediato para darte una solución concreta. ¿Me confirmas los detalles por este medio?`,
        "Tonos de reclamo/garantía requieren respuesta empática y seguimiento.",
        [],
        false,
      ),
    )
  }

  // Soporte → asistencia.
  if (has(intent, "soporte")) {
    suggestions.push(
      suggestion(
        `${saludo} entiendo el inconveniente. Voy a revisarlo paso a paso contigo; cuéntame exactamente qué estás viendo.`,
        "Tonos de soporte: primero entender el problema antes de proponer.",
        [],
        false,
      ),
    )
  }

  // Venta / consulta de producto sin datos → oferta genérica honesta.
  if (has(intent, "venta") || (has(intent, "consulta_producto") && !product)) {
    suggestions.push(
      suggestion(
        `${saludo} claro que sí. Cuéntame qué necesitas exactamente (modelo, talla o cantidad) y te paso disponibilidad y precio real.`,
        "Consulta de venta sin datos suficientes: se pide más detalle antes de prometer.",
        [],
        false,
      ),
    )
  }

  // Cierre: seguimiento (siempre presente, honesto).
  suggestions.push(
    suggestion(
      `${saludo} te confirmo lo que necesites en un momento. ¿Hay algo más que quieras consultar?`,
      "Cierre neutral: invita a continuar sin inventar información.",
      [],
      false,
    ),
  )

  return dedupe(suggestions).slice(0, 3)
}

function dedupe(items: CopilotSuggestion[]): CopilotSuggestion[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = item.text.trim().toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
