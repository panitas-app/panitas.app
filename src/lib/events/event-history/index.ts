/**
 * Event History (FASE 5H).
 *
 * Re-exporta los contratos, el store en memoria y el constructor de registros
 * de auditoría. El store Prisma se importa bajo demanda desde
 * `./prisma` (evita arrastrar Prisma en el camino por defecto).
 */
import { randomUUID } from "node:crypto"
import { getEventMeta } from "../event-registry"
import type { DispatchReport } from "../event-types"

export type {
  EventHistoryCountOptions,
  EventHistoryListOptions,
  EventHistoryRecord,
  EventHistoryStore,
} from "./types"

export { InMemoryEventHistoryStore } from "./in-memory"

/** Construye el registro de auditoría a partir del reporte de un despacho. */
export function buildEventHistoryRecord(report: DispatchReport) {
  const rejected = Boolean(report.rejected)
  const failed = report.results.some((r) => !r.ok)
  return {
    id: `evh_${randomUUID()}`,
    eventId: report.event.id,
    eventType: report.event.type,
    category: getEventMeta(report.event.type)?.category ?? "system",
    tenantId: report.event.tenantId,
    actorId: report.event.actorId,
    source: report.event.source,
    aggregateId: report.event.aggregateId,
    aggregateType: report.event.aggregateType,
    result: rejected ? "rejected" : failed ? "error" : "ok",
    status: rejected ? "rejected" : failed ? "failed" : "delivered",
    durationMs: report.durationMs,
    occurredAt: report.event.occurredAt,
    dispatchedAt: report.startedAt,
    listeners: report.results,
    error: report.rejected,
    metadata: report.event.metadata,
  } as const
}
