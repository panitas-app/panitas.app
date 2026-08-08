/**
 * Catálogo del Business Events Engine (FASE 5H).
 *
 * Registro central de TODOS los eventos de dominio. Cada evento tiene:
 *
 *   - categoría (para agrupar en dashboards/auditoría),
 *   - tipo de agregado sobre el que actúa (Order, Product, Customer...),
 *   - descripción breve.
 *
 * Incluye los eventos "legacy" que ya emitía `src/events/event.service.ts`
 * para que el puente (`legacy-bridge.ts`) los pueda republicar por el bus 5H
 * con el mismo contrato tipado.
 */
import type { EventCategory, EventMeta } from "./event-types"

export const EVENT_META: Record<string, EventMeta> = {
  // ── VENTAS ──────────────────────────────────────────────────────────────
  "sale.created": { category: "sales", aggregateType: "sale", description: "Se registró una venta/pedido." },
  "sale.updated": { category: "sales", aggregateType: "sale", description: "Se actualizó una venta." },
  "sale.deleted": { category: "sales", aggregateType: "sale", description: "Se eliminó una venta." },
  "sale.completed": { category: "sales", aggregateType: "sale", description: "Venta completada (pago verificado)." },
  "sale.refunded": { category: "sales", aggregateType: "sale", description: "Venta reembolsada." },
  "sale.cancelled": { category: "sales", aggregateType: "sale", description: "[legacy] Venta cancelada." },

  // ── PRODUCTOS ───────────────────────────────────────────────────────────
  "product.created": { category: "products", aggregateType: "product", description: "Se creó un producto." },
  "product.updated": { category: "products", aggregateType: "product", description: "Se actualizó un producto." },
  "product.deleted": { category: "products", aggregateType: "product", description: "Se eliminó un producto." },
  "product.stock.changed": { category: "products", aggregateType: "product", description: "El stock de un producto cambió." },
  "product.price.changed": { category: "products", aggregateType: "product", description: "El precio de un producto cambió." },

  // Inventario (legacy, agrupado en productos para el catálogo 5H).
  "inventory.created": { category: "products", aggregateType: "product", description: "[legacy] Producto creado con stock inicial." },
  "inventory.updated": { category: "products", aggregateType: "product", description: "[legacy] Stock actualizado." },
  "inventory.low_stock": { category: "products", aggregateType: "product", description: "[legacy] Stock bajo." },

  // ── CLIENTES ────────────────────────────────────────────────────────────
  "customer.created": { category: "customers", aggregateType: "customer", description: "Se creó un cliente." },
  "customer.updated": { category: "customers", aggregateType: "customer", description: "Se actualizó un cliente." },
  "customer.deleted": { category: "customers", aggregateType: "customer", description: "Se eliminó un cliente." },
  "customer.credit.created": { category: "customers", aggregateType: "customer", description: "Se otorgó un crédito a un cliente." },

  // ── CRÉDITOS ────────────────────────────────────────────────────────────
  "credit.created": { category: "credits", aggregateType: "credit", description: "Se creó un crédito." },
  "credit.updated": { category: "credits", aggregateType: "credit", description: "Se actualizó un crédito." },
  "credit.payment.created": { category: "credits", aggregateType: "credit", description: "Se registró un pago de crédito." },
  "credit.completed": { category: "credits", aggregateType: "credit", description: "Crédito saldado." },
  "credit.overdue": { category: "credits", aggregateType: "credit", description: "Crédito vencido." },

  // ── GASTOS ──────────────────────────────────────────────────────────────
  "expense.created": { category: "expenses", aggregateType: "expense", description: "Se registró un gasto." },
  "expense.updated": { category: "expenses", aggregateType: "expense", description: "Se actualizó un gasto." },
  "expense.deleted": { category: "expenses", aggregateType: "expense", description: "Se eliminó un gasto." },

  // ── PROVEEDORES ─────────────────────────────────────────────────────────
  "supplier.created": { category: "suppliers", aggregateType: "supplier", description: "Se creó un proveedor." },
  "supplier.updated": { category: "suppliers", aggregateType: "supplier", description: "Se actualizó un proveedor." },
  "supplier.deleted": { category: "suppliers", aggregateType: "supplier", description: "Se eliminó un proveedor." },
  "supplier.purchase.created": { category: "suppliers", aggregateType: "supplier", description: "Compra a proveedor registrada." },
  "supplier.invoice.created": { category: "suppliers", aggregateType: "supplier", description: "Factura/compra a proveedor registrada." },
  "supplier.payment.created": { category: "suppliers", aggregateType: "supplier", description: "Pago a proveedor registrado." },
  "supplier.payment.partial": { category: "suppliers", aggregateType: "supplier", description: "Abono parcial a proveedor registrado." },
  "supplier.balance.updated": { category: "suppliers", aggregateType: "supplier", description: "Saldo del proveedor actualizado." },

  // ── PEDIDOS ─────────────────────────────────────────────────────────────
  "order.created": { category: "orders", aggregateType: "order", description: "Se creó un pedido." },
  "order.updated": { category: "orders", aggregateType: "order", description: "Se actualizó un pedido." },
  "order.completed": { category: "orders", aggregateType: "order", description: "Pedido completado." },
  "order.cancelled": { category: "orders", aggregateType: "order", description: "Pedido cancelado." },

  // ── AGENDA ──────────────────────────────────────────────────────────────
  "appointment.created": { category: "agenda", aggregateType: "appointment", description: "Se agendó una cita." },
  "appointment.updated": { category: "agenda", aggregateType: "appointment", description: "Se actualizó una cita." },
  "appointment.cancelled": { category: "agenda", aggregateType: "appointment", description: "Se canceló una cita." },
  "reservation.created": { category: "agenda", aggregateType: "reservation", description: "Se creó una reserva." },
  "reservation.completed": { category: "agenda", aggregateType: "reservation", description: "Reserva completada." },

  // ── CONVERSACIONES ──────────────────────────────────────────────────────
  "conversation.started": { category: "conversations", aggregateType: "conversation", description: "Comenzó una conversación." },
  "conversation.finished": { category: "conversations", aggregateType: "conversation", description: "Terminó una conversación." },
  "conversation.intent.detected": { category: "conversations", aggregateType: "conversation", description: "Se detectó la intención del turno." },
  "conversation.message.created": { category: "conversations", aggregateType: "conversation", description: "Se creó un mensaje en la conversación." },
  "conversation.created": { category: "conversations", aggregateType: "conversation", description: "[legacy] Conversación creada." },
  "conversation.deleted": { category: "conversations", aggregateType: "conversation", description: "[legacy] Conversación eliminada." },
  "message.created": { category: "conversations", aggregateType: "conversation", description: "[legacy] Mensaje creado." },
  // Omnichannel Inbox (FASE 7A). Los eventos del inbox llevan `data.domain === "inbox"`
  // para distinguirlos de los eventos del motor conversacional del asistente.
  "conversation.updated": { category: "conversations", aggregateType: "inbox_conversation", description: "Conversación del inbox actualizada (estado, prioridad, asignación)." },
  "conversation.assigned": { category: "conversations", aggregateType: "inbox_conversation", description: "Conversación del inbox asignada a un agente." },
  "conversation.completed": { category: "conversations", aggregateType: "inbox_conversation", description: "Conversación del inbox resuelta/completada." },
  "conversation.tagged": { category: "conversations", aggregateType: "inbox_conversation", description: "Conversación del inbox etiquetada." },
  // Copiloto conversacional (FASE 7B). Los eventos del copiloto llevan `data.domain === "copilot"`.
  "conversation.summary.updated": { category: "conversations", aggregateType: "inbox_conversation", description: "El copiloto actualizó el resumen de la conversación." },
  "conversation.response.generated": { category: "conversations", aggregateType: "inbox_conversation", description: "El copiloto generó respuestas sugeridas ancladas en datos." },
  "conversation.action.suggested": { category: "conversations", aggregateType: "inbox_conversation", description: "El copiloto sugirió acciones inteligentes." },
  // Communication Integration Layer (FASE 7C). Los eventos de la capa de
  // comunicación llevan `data.domain === "communication"`.
  "channel.connected": { category: "conversations", aggregateType: "channel", description: "Un canal/proveedor de comunicación se conectó." },
  "channel.disconnected": { category: "conversations", aggregateType: "channel", description: "Un canal/proveedor de comunicación se desconectó." },
  "message.received": { category: "conversations", aggregateType: "channel", description: "El canal recibió un mensaje entrante del cliente." },
  "message.sent": { category: "conversations", aggregateType: "channel", description: "El canal envió un mensaje de salida del agente." },
  "provider.error": { category: "conversations", aggregateType: "provider", description: "Un proveedor de comunicación falló al operar." },
  "provider.retry": { category: "conversations", aggregateType: "provider", description: "Un proveedor de comunicación fue reintentado." },
  // Business Knowledge Base (FASE 7D). Los eventos de la Base de Conocimiento
  // llevan `data.domain === "knowledge"`.
  "knowledge.document.created": { category: "conversations", aggregateType: "knowledge_document", description: "Se creó un documento en la Base de Conocimiento." },
  "knowledge.document.updated": { category: "conversations", aggregateType: "knowledge_document", description: "Se actualizó un documento de la Base de Conocimiento." },
  "knowledge.document.deleted": { category: "conversations", aggregateType: "knowledge_document", description: "Se eliminó un documento de la Base de Conocimiento." },
  "knowledge.document.indexed": { category: "conversations", aggregateType: "knowledge_document", description: "Se indexó un documento (contenido + metadatos + embeddings futuros)." },
  "knowledge.search.executed": { category: "conversations", aggregateType: "knowledge_document", description: "Se ejecutó una búsqueda híbrida en la Base de Conocimiento." },

  // ── COBRANZA (FASE 6B) ─────────────────────────────────────────────────
  "collection.reminder.prepared": { category: "collection", aggregateType: "credit", description: "Se preparó un recordatorio de cobranza (no enviado)." },
  "collection.reminder.sent": { category: "collection", aggregateType: "credit", description: "El usuario marcó el recordatorio como enviado." },
  "collection.reminder.edited": { category: "collection", aggregateType: "credit", description: "Se editó una plantilla de cobranza." },
  "collection.contact.logged": { category: "collection", aggregateType: "credit", description: "Se registró un contacto de cobranza." },
  "collection.settings.updated": { category: "collection", aggregateType: "store", description: "Se actualizó la configuración de cobranza." },

  // ── IA ──────────────────────────────────────────────────────────────────
  "assistant.monitor.updated": { category: "assistant", aggregateType: "assistant", description: "El monitor de negocio generó un resumen." },
  "assistant.recommendation.created": { category: "assistant", aggregateType: "assistant", description: "Se generaron recomendaciones." },
  "assistant.memory.updated": { category: "assistant", aggregateType: "assistant", description: "Se actualizó la memoria del asistente." },
  "assistant.context.updated": { category: "assistant", aggregateType: "assistant", description: "Se actualizó el contexto del asistente." },

  // Memoria estable (legacy, agrupada en IA para el catálogo 5H).
  "memory.created": { category: "assistant", aggregateType: "memory", description: "[legacy] Recuerdo creado." },
  "memory.updated": { category: "assistant", aggregateType: "memory", description: "[legacy] Recuerdo actualizado." },
  "memory.deleted": { category: "assistant", aggregateType: "memory", description: "[legacy] Recuerdo eliminado." },
}

export type BusinessEventName = keyof typeof EVENT_META

export const EVENT_CATEGORIES: readonly EventCategory[] = [
  "sales",
  "products",
  "customers",
  "credits",
  "expenses",
  "suppliers",
  "orders",
  "agenda",
  "conversations",
  "assistant",
  "collection",
  "system",
]

/** Nombres de los eventos que el EventService legacy emite (para el puente). */
export const LEGACY_EVENT_NAMES: readonly string[] = [
  "sale.created",
  "sale.completed",
  "sale.cancelled",
  "order.created",
  "order.completed",
  "order.cancelled",
  "product.created",
  "product.updated",
  "inventory.created",
  "inventory.updated",
  "inventory.low_stock",
  "appointment.created",
  "customer.created",
  "customer.updated",
  "conversation.created",
  "conversation.deleted",
  "message.created",
  "expense.created",
  "expense.updated",
  "memory.created",
  "memory.updated",
  "memory.deleted",
]

export function getEventMeta(type: string): EventMeta | undefined {
  return EVENT_META[type]
}

export function isKnownEvent(type: string): boolean {
  return type in EVENT_META
}
