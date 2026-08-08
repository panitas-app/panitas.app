/**
 * Confirmation System (FASE 4A + 5B).
 *
 * Garantiza que las acciones destructivas o críticas NUNCA se ejecuten sin
 * confirmación explícita del usuario. Define las reglas declarativas, evalúa
 * un plan, produce la solicitud de confirmación y valida las confirmaciones
 * recibidas en la segunda vuelta.
 *
 * FASE 5B: todas las descripciones e impactos están en lenguaje natural, sin
 * nombres internos de herramientas. Los tool names quedan solo en la capa
 * interna (`ConfirmationAction.tool`) y se descartan antes de llegar al cliente.
 *
 * El Execution Planner consulta `requirementsFor(plan)` ANTES de ejecutar
 * cualquier paso; si un paso exige confirmación y no está en `confirmedStepIds`,
 * NO se ejecuta.
 */
import type { ConfirmationAction, ConfirmationRequest, ConfirmationRule, ExecutionPlan, PlannedStep } from "./types"

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "pendiente",
  confirmed: "confirmado",
  preparing: "en preparación",
  shipped: "enviado",
  delivered: "entregado",
  cancelled: "cancelado",
}

function orderStatusLabel(status: unknown): string {
  return ORDER_STATUS_LABELS[String(status ?? "")] ?? "actualizado"
}

function quantityOf(input: Record<string, unknown>): string {
  const quantity = input.quantity
  if (typeof quantity === "number" && Number.isFinite(quantity)) return `${quantity} unidad(es)`
  return "la cantidad indicada"
}

export const DEFAULT_CONFIRMATION_RULES: ConfirmationRule[] = [
  {
    tool: "products.delete",
    description: () => "Eliminar el producto permanentemente",
    impact: () => "El producto dejará de estar disponible y no se podrá recuperar. El historial de ventas se conserva.",
  },
  {
    tool: "orders.updateStatus",
    description: (input) =>
      input.status === "cancelled"
        ? "Cancelar la venta o pedido"
        : `Marcar el pedido como ${orderStatusLabel(input.status)}`,
    impact: (input) =>
      input.status === "cancelled"
        ? "La orden quedará cancelada y el stock de los productos vendidos volverá a estar disponible."
        : "El pedido cambiará de estado y podría afectar el inventario.",
    when: (input) => input.status === "cancelled",
  },
  {
    tool: "inventory.updateStock",
    description: (input) =>
      input.type === "decrease"
        ? `Reducir el stock en ${quantityOf(input)}`
        : "Ajustar el stock del producto",
    impact: (input) =>
      input.type === "decrease"
        ? "La cantidad disponible del producto disminuirá."
        : "Se fijará la cantidad disponible del producto.",
    when: (input) => input.type === "decrease" || input.type === "adjustment",
  },
]

export interface ConfirmationSystemOptions {
  rules?: ConfirmationRule[]
}

export class ConfirmationSystem {
  private readonly rules: ConfirmationRule[]

  constructor(options: ConfirmationSystemOptions = {}) {
    this.rules = options.rules ?? DEFAULT_CONFIRMATION_RULES
  }

  /** Devuelve los pasos del plan que exigen confirmación. */
  requirementsFor(plan: ExecutionPlan): PlannedStep[] {
    return plan.steps.filter((step) => this.matchesRule(step))
  }

  /** true si el paso exige confirmación según las reglas. */
  private matchesRule(step: PlannedStep): boolean {
    if (step.requiresConfirmation) return true
    return this.rules.some((rule) => rule.tool === step.tool && (!rule.when || rule.when(step.input)))
  }

  /** Construye la solicitud de confirmación para un plan. */
  request(plan: ExecutionPlan): ConfirmationRequest {
    const actions: ConfirmationAction[] = []
    const confirmCodes: string[] = []

    for (const step of this.requirementsFor(plan)) {
      const rule = this.rules.find((r) => r.tool === step.tool && (!r.when || r.when(step.input)))
      actions.push({
        stepId: step.id,
        tool: step.tool,
        description: rule?.description(step.input) ?? "Confirmar esta acción antes de continuar",
        impact: rule?.impact(step.input) ?? "Esta acción no se puede deshacer automáticamente.",
      })
      confirmCodes.push(`confirm:${step.id}`)
    }

    return {
      actions,
      confirmCodes,
      message: `Necesito tu confirmación antes de continuar:\n${actions
        .map((a) => `- ${a.description}. ${a.impact}`)
        .join("\n")}\n\n¿Confirmas que deseas proceder?`,
      requestedAt: new Date().toISOString(),
    }
  }

  /** true si todos los pasos que requieren confirmación están confirmados. */
  isFullyConfirmed(plan: ExecutionPlan, confirmedStepIds: string[] | undefined): boolean {
    const required = this.requirementsFor(plan)
    if (required.length === 0) return true
    if (!confirmedStepIds) return false
    return required.every((step) => confirmedStepIds.includes(step.id))
  }
}
