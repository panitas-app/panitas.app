/**
 * Conversational AI Copilot (FASE 7B) — Consultas en lenguaje natural.
 *
 * Responde preguntas del usuario sobre la conversación y el cliente usando
 * SOLO datos reales del negocio: compras, deuda, última compra, pedidos
 * pendientes, productos frecuentes, inventario y ficha del cliente. Si la
 * pregunta no encaja en ninguna categoría conocida, responde con un mensaje
 * honesto que lista qué puede preguntar (nunca inventa la respuesta).
 */
import { COPILOT_QUERY_INTENTS, type CopilotProductHit, type CopilotQueryAnswer, type CopilotQueryIntent } from "./conversation-types"
import { detectQueryIntent } from "./intent-detector"
import type { CopilotCustomerContext } from "./conversation-types"

export interface QueryAnswerInput {
  question: string
  customerName: string | null
  context: CopilotCustomerContext | null
  inventoryHits: CopilotProductHit[]
}

function fmtMoney(value: number): string {
  return value.toLocaleString("es-EC", { style: "currency", currency: "USD" })
}

function nameOf(input: QueryAnswerInput): string {
  return input.context?.customer?.name?.trim() || input.customerName?.trim() || "el cliente"
}

function dateOf(iso: string | null): string {
  if (!iso) return "sin registro"
  return new Date(iso).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" })
}

/** Construye la respuesta grounded a una consulta en lenguaje natural. */
export function buildQueryAnswer(input: QueryAnswerInput): CopilotQueryAnswer {
  const intent = detectQueryIntent(input.question)
  const { context: ctx } = input

  switch (intent) {
    case "compras": {
      if (!ctx?.customer) return noData(input.question, intent)
      return {
        question: input.question,
        queryIntent: intent,
        content: `${nameOf(input)} ha hecho ${ctx.customer?.totalOrders ?? 0} compra(s) por un total de ${fmtMoney(ctx.customer?.totalSpent ?? 0)}. Última compra: ${dateOf(ctx.customer?.lastPurchaseAt ?? null)}.`,
        dataSources: ["crm:compras", "crm:total_gastado", "crm:ultima_compra"],
      }
    }

    case "deuda": {
      if (!ctx || ctx.totalDebt === 0) {
        return {
          question: input.question,
          queryIntent: intent,
          content: ctx ? `${nameOf(input)} no tiene deudas pendientes.` : noData(input.question, intent).content,
          dataSources: ctx ? ["creditos:saldo"] : [],
        }
      }
      return {
        question: input.question,
        queryIntent: intent,
        content: `${nameOf(input)} debe ${fmtMoney(ctx.totalDebt)} en total (${fmtMoney(ctx.credits.pendingAmount)} en cuotas vigentes y ${fmtMoney(ctx.credits.overdueAmount)} vencidas). Próximo vencimiento: ${dateOf(ctx.credits.nextDueDate)}.`,
        dataSources: ["creditos:pendiente", "creditos:vencido", "creditos:proximo_vencimiento"],
      }
    }

    case "ultima_compra": {
      if (!ctx) return noData(input.question, intent)
      const last = ctx.orders[0]
      if (!last) {
        return {
          question: input.question,
          queryIntent: intent,
          content: `${nameOf(input)} todavía no tiene compras registradas.`,
          dataSources: ["crm:ultima_compra"],
        }
      }
      const items = last.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ")
      return {
        question: input.question,
        queryIntent: intent,
        content: `La última compra de ${nameOf(input)} fue el ${dateOf(last.createdAt)} (pedido ${last.orderNumber}) por ${fmtMoney(last.total)}: ${items}.`,
        dataSources: ["pedidos:ultima_compra", "pedidos:items"],
      }
    }

    case "pedidos_pendientes": {
      if (!ctx) return noData(input.question, intent)
      const pending = ctx.pendingOrders
      if (pending.length === 0) {
        return {
          question: input.question,
          queryIntent: intent,
          content: `${nameOf(input)} no tiene pedidos pendientes en este momento.`,
          dataSources: ["pedidos:pendientes"],
        }
      }
      const list = pending
        .slice(0, 3)
        .map((o) => `${o.orderNumber} (${o.status}) por ${fmtMoney(o.total)}`)
        .join("; ")
      return {
        question: input.question,
        queryIntent: intent,
        content: `${nameOf(input)} tiene ${pending.length} pedido(s) sin finalizar: ${list}.`,
        dataSources: ["pedidos:pendientes"],
      }
    }

    case "productos_frecuentes": {
      if (!ctx) return noData(input.question, intent)
      const favs = ctx.favoriteProducts
      if (favs.length === 0) {
        return {
          question: input.question,
          queryIntent: intent,
          content: `Aún no hay suficientes compras para identificar los productos frecuentes de ${nameOf(input)}.`,
          dataSources: ["crm:productos_frecuentes"],
        }
      }
      const list = favs.slice(0, 5).map((p) => `${p.quantity}× ${p.productName}`).join(", ")
      return {
        question: input.question,
        queryIntent: intent,
        content: `Los productos que ${nameOf(input)} compra con más frecuencia: ${list}.`,
        dataSources: ["crm:productos_frecuentes"],
      }
    }

    case "inventario": {
      if (input.inventoryHits.length === 0) {
        return {
          question: input.question,
          queryIntent: intent,
          content: "No encontré productos en el inventario que coincidan con tu búsqueda. Prueba con otro nombre.",
          dataSources: [],
        }
      }
      const list = input.inventoryHits
        .slice(0, 5)
        .map((p) => `${p.name} (${fmtMoney(p.price)} — ${p.stock} en stock)`)
        .join("; ")
      return {
        question: input.question,
        queryIntent: intent,
        content: `En inventario encontré: ${list}.`,
        dataSources: ["inventario:precio", "inventario:stock"],
      }
    }

    case "cliente": {
      if (!ctx) return noData(input.question, intent)
      const c = ctx.customer
      if (!c) {
        return {
          question: input.question,
          queryIntent: intent,
          content: "Esta conversación todavía no está asociada a una ficha de cliente.",
          dataSources: [],
        }
      }
      const tags = c.tags.length > 0 ? c.tags.join(", ") : "sin etiquetas"
      return {
        question: input.question,
        queryIntent: intent,
        content: `${c.name} · ${c.phone} · ${c.email ?? "sin email"} · ${c.city ?? "ciudad sin registrar"}. ${c.totalOrders} compra(s), ${fmtMoney(c.totalSpent)} gastados, etiquetas: ${tags}.`,
        dataSources: ["crm:ficha", "crm:etiquetas"],
      }
    }

    default:
      return {
        question: input.question,
        queryIntent: "otro",
        content:
          "Puedo ayudarte a responder consultas como: ¿qué ha comprado este cliente?, ¿cuánto debe?, ¿cuál fue su última compra?, ¿tiene pedidos pendientes?, ¿qué productos suele comprar?, ¿qué productos hay en inventario? o detalles de la ficha del cliente.",
        dataSources: [],
      }
  }
}

function noData(question: string, queryIntent: CopilotQueryIntent): CopilotQueryAnswer {
  return {
    question,
    queryIntent,
    content: "No tengo información del cliente asociada a esta conversación para responder con certeza.",
    dataSources: [],
  }
}

export type { CopilotProductHit, CopilotQueryAnswer, CopilotQueryIntent }
export { COPILOT_QUERY_INTENTS }
