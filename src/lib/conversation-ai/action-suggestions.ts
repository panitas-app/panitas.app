/**
 * Conversational AI Copilot (FASE 7B) — Acciones inteligentes.
 *
 * Cuando la IA detecta oportunidades, sugiere acciones accionables con enlace
 * real al dashboard: crear cotización/pedido, registrar cliente o venta,
 * consultar crédito, registrar pago, revisar inventario o abrir la ficha del
 * cliente. Las acciones se generan solo con señales reales (nunca se inventan).
 */
import type { RecommendationTone } from "@/lib/inbox/conversation-types"
import { COPILOT_ACTION_HREFS, type CopilotAction, type CopilotActionType, type CopilotIntentDetection, type CopilotIntent } from "./conversation-types"

export interface ActionInput {
  intent: CopilotIntentDetection
  customerId: string | null
  hasPendingOrders: boolean
  hasActiveCredits: boolean
  totalDebt: number
  hasInventoryHits: boolean
}

function action(
  type: CopilotActionType,
  label: string,
  description: string,
  tone: RecommendationTone,
  payload?: Record<string, unknown>,
): CopilotAction {
  return { id: type, type, label, description, href: COPILOT_ACTION_HREFS[type], payload, tone }
}

function has(intent: CopilotIntentDetection, kind: CopilotIntent): boolean {
  return intent.intents.includes(kind)
}

/** Genera acciones sugeridas según la intención y el contexto real. */
export function suggestActions(input: ActionInput): CopilotAction[] {
  const { intent, customerId, hasPendingOrders, hasActiveCredits, totalDebt, hasInventoryHits } = input
  const actions: CopilotAction[] = []
  const customerPayload = customerId ? { customerId } : undefined

  const sellsIntent = has(intent, "venta") || has(intent, "precio") || has(intent, "disponibilidad")
  if (sellsIntent) {
    actions.push(
      action(
        "create_order",
        "Crear pedido",
        "Registra el pedido que el cliente está pidiendo desde el chat.",
        "success",
        { customerId: customerId ?? undefined, productHit: hasInventoryHits ? "inventario encontrado" : undefined },
      ),
      action(
        "create_quote",
        "Crear cotización",
        "Prepara una cotización con los productos consultados.",
        "info",
        customerPayload,
      ),
    )
  }

  if (sellsIntent && !customerId) {
    actions.push(
      action(
        "register_customer",
        "Registrar cliente",
        "El contacto aún no está en el CRM. Crea la ficha para asociar la conversación.",
        "default",
      ),
    )
  }

  if (has(intent, "cobranza") || totalDebt > 0) {
    actions.push(
      action("check_credit", "Consultar crédito", "Revisa el detalle de cuotas y saldos del cliente.", "warning", customerPayload),
      action("register_payment", "Registrar pago", "Registra el abono que el cliente realizó.", "success", customerPayload),
    )
  }

  if (has(intent, "pedido") || hasPendingOrders) {
    actions.push(
      action("check_orders", "Revisar pedidos", "Consulta el estado de los pedidos del cliente.", "info", customerPayload),
    )
  }

  if (has(intent, "precio") || has(intent, "disponibilidad") || has(intent, "consulta_producto")) {
    actions.push(
      action("check_inventory", "Consultar inventario", "Verifica stock y precios reales en el inventario.", "info"),
    )
  }

  if (hasActiveCredits) {
    actions.push(
      action("register_payment", "Registrar abono", "Hay crédito activo: registra el abono del cliente.", "success", customerPayload),
    )
  }

  if (customerId) {
    actions.push(
      action("open_customer_profile", "Abrir ficha del cliente", "Abre el perfil completo del cliente en el CRM.", "default", customerPayload),
    )
  } else if (!sellsIntent) {
    actions.push(
      action("register_customer", "Registrar cliente", "Asocia esta conversación a una ficha del CRM.", "default"),
    )
  }

  const seen = new Set<CopilotActionType>()
  return actions.filter((a) => {
    if (seen.has(a.type)) return false
    seen.add(a.type)
    return true
  })
}
