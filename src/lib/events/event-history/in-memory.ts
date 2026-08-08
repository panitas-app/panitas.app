/**
 * Event History — store en memoria (FASE 5H).
 *
 * Implementación para tests, desarrollo y por defecto del sistema. Respeta el
 * aislamiento multi-tenant: cada registro pertenece a un `tenantId`.
 */
import type {
  EventHistoryCountOptions,
  EventHistoryListOptions,
  EventHistoryRecord,
  EventHistoryStore,
} from "./types"

const MAX_RECORDS = 10_000

export class InMemoryEventHistoryStore implements EventHistoryStore {
  private readonly records: EventHistoryRecord[] = []

  async record(entry: EventHistoryRecord): Promise<void> {
    this.records.push(entry)
    if (this.records.length > MAX_RECORDS) {
      this.records.splice(0, this.records.length - MAX_RECORDS)
    }
  }

  async list(options: EventHistoryListOptions = {}): Promise<EventHistoryRecord[]> {
    let list = this.records
    if (options.tenantId) {
      list = list.filter((r) => r.tenantId === options.tenantId)
    }
    if (options.eventType) {
      list = list.filter((r) => r.eventType === options.eventType)
    }
    const sorted = [...list].sort((a, b) => b.dispatchedAt.localeCompare(a.dispatchedAt))
    const offset = options.offset ?? 0
    const limit = options.limit ?? sorted.length
    return sorted.slice(offset, offset + limit)
  }

  async count(options: EventHistoryCountOptions = {}): Promise<number> {
    if (options.tenantId) {
      return this.records.filter((r) => r.tenantId === options.tenantId).length
    }
    return this.records.length
  }
}
