/**
 * Event History — persistencia Prisma (FASE 5H).
 *
 * Reutiliza el modelo `AuditLog` existente (sin migraciones nuevas): cada
 * despacho se registra como una fila con `action = "event.{tipo}"` y el
 * detalle completo (resultado, duración, estado, origen, listeners) en
 * `metadata` (JSON). La escritura es best-effort: si la BD falla, el evento
 * ya se distribuyó y la auditoría se degrada sin romper nada.
 */
import { prisma } from "@/lib/prisma"
import type {
  EventHistoryCountOptions,
  EventHistoryListOptions,
  EventHistoryRecord,
  EventHistoryStore,
} from "./types"

export interface AuditLogInput {
  action: string
  entity: string
  entityId: string | null
  metadata: string | null
  userId: string | null
  storeId: string | null
}

export function toAuditLogInput(entry: EventHistoryRecord): AuditLogInput {
  return {
    action: `event.${entry.eventType}`,
    entity: "Event",
    entityId: entry.aggregateId ?? null,
    userId: entry.actorId ?? null,
    storeId: entry.tenantId ?? null,
    metadata: JSON.stringify({
      eventId: entry.eventId,
      category: entry.category,
      source: entry.source,
      result: entry.result,
      status: entry.status,
      durationMs: entry.durationMs,
      occurredAt: entry.occurredAt,
      dispatchedAt: entry.dispatchedAt,
      listeners: entry.listeners,
      error: entry.error ?? null,
    }),
  }
}

export class PrismaEventHistoryStore implements EventHistoryStore {
  async record(entry: EventHistoryRecord): Promise<void> {
    try {
      await prisma.auditLog.create({ data: toAuditLogInput(entry) })
    } catch (error) {
      console.error("[events] auditoría no persistida:", error instanceof Error ? error.message : error)
    }
  }

  async list(options: EventHistoryListOptions = {}): Promise<EventHistoryRecord[]> {
    const rows = await prisma.auditLog.findMany({
      where: {
        action: options.eventType ? `event.${options.eventType}` : { startsWith: "event." },
        storeId: options.tenantId ?? undefined,
      },
      orderBy: { createdAt: "desc" },
      skip: options.offset,
      take: options.limit,
    })
    return rows.map(fromAuditLogRow)
  }

  async count(options: EventHistoryCountOptions = {}): Promise<number> {
    return prisma.auditLog.count({
      where: {
        action: { startsWith: "event." },
        storeId: options.tenantId ?? undefined,
      },
    })
  }
}

function fromAuditLogRow(row: {
  id: string
  action: string
  entityId: string | null
  metadata: string | null
  userId: string | null
  storeId: string | null
  createdAt: Date
}): EventHistoryRecord {
  const eventType = row.action.replace(/^event\./, "")
  let meta: Record<string, unknown> = {}
  if (row.metadata) {
    try {
      const parsed = JSON.parse(row.metadata) as Record<string, unknown>
      if (parsed && typeof parsed === "object") meta = parsed
    } catch {
      meta = {}
    }
  }
  return {
    id: row.id,
    eventId: (meta.eventId as string) ?? row.id,
    eventType,
    category: (meta.category as string) ?? "system",
    tenantId: row.storeId ?? "",
    actorId: row.userId ?? undefined,
    source: (meta.source as string) ?? "unknown",
    aggregateId: row.entityId ?? undefined,
    aggregateType: "Event",
    result: (meta.result as EventHistoryRecord["result"]) ?? "ok",
    status: (meta.status as EventHistoryRecord["status"]) ?? "delivered",
    durationMs: (meta.durationMs as number) ?? 0,
    occurredAt: (meta.occurredAt as string) ?? row.createdAt.toISOString(),
    dispatchedAt: (meta.dispatchedAt as string) ?? row.createdAt.toISOString(),
    listeners: Array.isArray(meta.listeners) ? (meta.listeners as EventHistoryRecord["listeners"]) : [],
    error: (meta.error as string | undefined) ?? undefined,
    metadata: meta,
  }
}
