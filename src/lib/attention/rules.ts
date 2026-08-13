/**
 * Catálogo de reglas de atención (FASE 8C).
 *
 * Cada regla define el tipo de atención, su etiqueta para la UI, la prioridad
 * por defecto, los eventos de negocio que la invalidan (para el listener) y el
 * deep link hacia el módulo donde se resuelve. Las reglas NO inventan nada:
 * solo transforman situaciones reales detectadas por los detectors.
 */
import type { AttentionAction, AttentionPriority, AttentionType } from "./types"

export type AttentionGroupKey =
  | "inventory"
  | "credits"
  | "suppliers"
  | "orders"
  | "conversations"
  | "channels"

export interface AttentionRuleDefinition {
  type: AttentionType
  /** Etiqueta singular. */
  label: string
  /** Etiqueta plural (para grupos como "5 productos agotados"). */
  pluralLabel: string
  group: AttentionGroupKey
  /** Prioridad por defecto para este tipo. */
  priority: AttentionPriority
  /** Eventos de negocio que invalidan esta regla (re-sync del listener). */
  eventTriggers: readonly string[]
  /** Construye el deep link a partir del entityId. */
  action: (entityId: string) => AttentionAction
}

/** Grupo de cada tipo (para agrupar en la UI). */
export function attentionGroupOf(type: AttentionType): AttentionGroupKey {
  return ATTENTION_RULES[type]?.group ?? "inventory"
}

export function attentionLabel(type: AttentionType): string {
  return ATTENTION_RULES[type]?.label ?? type
}

export function attentionPluralLabel(type: AttentionType): string {
  return ATTENTION_RULES[type]?.pluralLabel ?? ATTENTION_RULES[type]?.label ?? type
}

export function attentionDefaultPriority(type: AttentionType): AttentionPriority {
  return ATTENTION_RULES[type]?.priority ?? "medium"
}

export const ATTENTION_RULES: Record<AttentionType, AttentionRuleDefinition> = {
  "inventory.out_of_stock": {
    type: "inventory.out_of_stock",
    label: "Producto agotado",
    pluralLabel: "Productos agotados",
    group: "inventory",
    priority: "high",
    eventTriggers: ["inventory.updated", "inventory.low_stock", "product.stock.changed", "sale.created"],
    action: (entityId) => ({ label: "Ver producto", href: `/dashboard/products?productId=${encodeURIComponent(entityId)}` }),
  },
  "inventory.low_stock": {
    type: "inventory.low_stock",
    label: "Producto por agotarse",
    pluralLabel: "Productos por agotarse",
    group: "inventory",
    priority: "medium",
    eventTriggers: ["inventory.updated", "inventory.low_stock", "product.stock.changed", "sale.created"],
    action: (entityId) => ({ label: "Ver producto", href: `/dashboard/products?productId=${encodeURIComponent(entityId)}` }),
  },
  "inventory.no_movement": {
    type: "inventory.no_movement",
    label: "Producto sin movimiento",
    pluralLabel: "Productos sin movimiento",
    group: "inventory",
    priority: "low",
    eventTriggers: ["inventory.updated", "inventory.low_stock", "product.stock.changed", "stock.movement.created"],
    action: (entityId) => ({ label: "Ver producto", href: `/dashboard/products?productId=${encodeURIComponent(entityId)}` }),
  },
  "credit.overdue": {
    type: "credit.overdue",
    label: "Cuota vencida",
    pluralLabel: "Cuotas vencidas",
    group: "credits",
    priority: "high",
    eventTriggers: ["credit.overdue", "credit.payment.created", "installment.paid", "sale.created"],
    action: (entityId) => ({ label: "Ver crédito", href: `/dashboard/creditos?orderId=${encodeURIComponent(entityId)}` }),
  },
  "credit.upcoming": {
    type: "credit.upcoming",
    label: "Cuota por vencer",
    pluralLabel: "Cuotas por vencer",
    group: "credits",
    priority: "medium",
    eventTriggers: ["credit.payment.created", "installment.paid", "sale.created"],
    action: (entityId) => ({ label: "Ver crédito", href: `/dashboard/creditos?orderId=${encodeURIComponent(entityId)}` }),
  },
  "supplier.overdue": {
    type: "supplier.overdue",
    label: "Factura de proveedor vencida",
    pluralLabel: "Facturas de proveedor vencidas",
    group: "suppliers",
    priority: "high",
    eventTriggers: ["supplier.invoice.created", "supplier.payment.created", "supplier.payment.partial", "supplier.balance.updated"],
    action: (entityId) => ({ label: "Ver factura", href: `/dashboard/suppliers?invoiceId=${encodeURIComponent(entityId)}` }),
  },
  "supplier.pending_balance": {
    type: "supplier.pending_balance",
    label: "Factura de proveedor por pagar",
    pluralLabel: "Facturas de proveedor por pagar",
    group: "suppliers",
    priority: "medium",
    eventTriggers: ["supplier.invoice.created", "supplier.payment.created", "supplier.payment.partial", "supplier.balance.updated"],
    action: (entityId) => ({ label: "Ver factura", href: `/dashboard/suppliers?invoiceId=${encodeURIComponent(entityId)}` }),
  },
  "order.delayed": {
    type: "order.delayed",
    label: "Pedido retrasado",
    pluralLabel: "Pedidos retrasados",
    group: "orders",
    priority: "medium",
    eventTriggers: ["order.updated", "order.created", "order.completed", "order.cancelled"],
    action: (entityId) => ({ label: "Ver pedido", href: `/dashboard/orders?orderId=${encodeURIComponent(entityId)}` }),
  },
  "order.pending": {
    type: "order.pending",
    label: "Pedido por confirmar",
    pluralLabel: "Pedidos por confirmar",
    group: "orders",
    priority: "low",
    eventTriggers: ["order.created", "order.updated", "order.completed", "order.cancelled"],
    action: (entityId) => ({ label: "Ver pedido", href: `/dashboard/orders?orderId=${encodeURIComponent(entityId)}` }),
  },
  "conversation.pending": {
    type: "conversation.pending",
    label: "Conversación sin responder",
    pluralLabel: "Conversaciones sin responder",
    group: "conversations",
    priority: "medium",
    eventTriggers: [
      "conversation.message.created",
      "conversation.completed",
      "conversation.updated",
      "conversation.assigned",
      "whatsapp.conversation.upserted",
      "instagram.conversation.upserted",
      "messenger.conversation.upserted",
    ],
    action: (entityId) => ({ label: "Responder", href: `/dashboard/conversaciones?conversationId=${encodeURIComponent(entityId)}` }),
  },
  "channel.disconnected": {
    type: "channel.disconnected",
    label: "Canal desconectado",
    pluralLabel: "Canales desconectados",
    group: "channels",
    priority: "critical",
    eventTriggers: ["channel.disconnected", "channel.connected"],
    action: (entityId) => ({ label: "Revisar canal", href: `/dashboard/conversaciones?channel=${encodeURIComponent(entityId)}` }),
  },
  "channel.error": {
    type: "channel.error",
    label: "Canal con error",
    pluralLabel: "Canales con error",
    group: "channels",
    priority: "high",
    eventTriggers: ["channel.disconnected", "channel.connected"],
    action: (entityId) => ({ label: "Revisar canal", href: `/dashboard/conversaciones?channel=${encodeURIComponent(entityId)}` }),
  },
}
