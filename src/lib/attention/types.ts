/**
 * Tipos del Sistema de Atención (FASE 8C).
 *
 * "Atención" ≠ "evento" ni "novedad": es una situación que requiere acción
 * del negocio (un producto agotado, una cuota vencida, una factura por pagar,
 * una conversación sin responder). Cada `AttentionItem` representa UNA
 * situación deduplicada. La prioridad es una sola escala derivada de datos
 * reales por las reglas (en v1 severity ≡ priority), NUNCA inventada por IA.
 */

/** Estados del ciclo de vida de un item de atención. */
export type AttentionStatus = "new" | "acknowledged" | "snoozed" | "resolved" | "dismissed"

/** Estados "abiertos" (siguen visibles en el centro de atención). */
export const OPEN_STATUSES: readonly AttentionStatus[] = ["new", "acknowledged", "snoozed"]

/** Prioridades (escala única severity/priority). De mayor a menor urgencia. */
export type AttentionPriority = "critical" | "high" | "medium" | "low"

export const ATTENTION_PRIORITIES: readonly AttentionPriority[] = ["critical", "high", "medium", "low"]

export const PRIORITY_RANK: Record<AttentionPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

export function rankPriority(p: AttentionPriority): number {
  return PRIORITY_RANK[p] ?? 3
}

/** ¿`priority` es igual o más urgente que `min`? (`low` es lo menos urgente). */
export function isAtLeastPriority(priority: AttentionPriority, min: AttentionPriority): boolean {
  return rankPriority(priority) <= rankPriority(min)
}

/** Fuentes de un item. `detector` y `event` son deterministas; `manual` es explícito. */
export type AttentionSource = "detector" | "event" | "manual"

/** Tipos de atención soportados por el motor de reglas (FASE 8C). */
export type AttentionType =
  | "inventory.out_of_stock"
  | "inventory.low_stock"
  | "inventory.no_movement"
  | "credit.overdue"
  | "credit.upcoming"
  | "supplier.overdue"
  | "supplier.pending_balance"
  | "order.delayed"
  | "order.pending"
  | "conversation.pending"
  | "channel.disconnected"
  | "channel.error"

export const ATTENTION_TYPES: readonly AttentionType[] = [
  "inventory.out_of_stock",
  "inventory.low_stock",
  "inventory.no_movement",
  "credit.overdue",
  "credit.upcoming",
  "supplier.overdue",
  "supplier.pending_balance",
  "order.delayed",
  "order.pending",
  "conversation.pending",
  "channel.disconnected",
  "channel.error",
]

export function isAttentionType(value: string): value is AttentionType {
  return (ATTENTION_TYPES as readonly string[]).includes(value)
}

/** Deep link interno (o externo) con su etiqueta. */
export interface AttentionAction {
  label: string
  href: string
  external?: boolean
}

/** Situación detectada por una regla (intermedio antes de persistir). */
export interface Situation {
  type: AttentionType
  priority: AttentionPriority
  entityType: string
  entityId: string
  title: string
  description: string
  recommendation?: string
  action?: AttentionAction
  metadata?: Record<string, unknown>
}

/** DTO público de un AttentionItem persistido. */
export interface AttentionItemDTO {
  id: string
  type: AttentionType
  priority: AttentionPriority
  status: AttentionStatus
  title: string
  description: string
  recommendation: string | null
  source: AttentionSource
  entityType: string
  entityId: string
  action: AttentionAction | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  snoozedUntil: string | null
}

/** Grupo de atención (agregación por tipo para el centro de atención). */
export interface AttentionGroup {
  type: AttentionType
  label: string
  /** Ítems de este grupo en la página actual (abiertos). */
  count: number
  /** Ítems abiertos totales del tipo (incluye pospuestos). */
  total: number
  priority: AttentionPriority
  items: AttentionItemDTO[]
}

/** Conteos agregados (badge de nav + monitor de negocio). */
export interface AttentionOverview {
  open: number
  critical: number
  high: number
  byStatus: Record<AttentionStatus, number>
  byPriority: Record<AttentionPriority, number>
  byType: Partial<Record<AttentionType, number>>
}

/** Filtros de consulta del centro de atención. */
export interface AttentionListQuery {
  /** Filtro de estado; "open" (alias "active") = new + acknowledged + snoozed. */
  status?: AttentionStatus | "open" | "active"
  priority?: AttentionPriority
  type?: AttentionType
  search?: string
  limit?: number
}

export function isOpenStatus(status: AttentionStatus): boolean {
  return OPEN_STATUSES.includes(status)
}

export function isOpenQuery(status: AttentionStatus | "open" | "active" | undefined): boolean {
  return status === undefined || status === "open" || status === "active"
}
