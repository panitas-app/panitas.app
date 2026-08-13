/**
 * Fake in-memory de PrismaClient para tests de Atención (FASE 8C).
 *
 * Implementa solo las operaciones que usa el `AttentionService`:
 * `attentionItem` (findMany/create/update/updateMany/findUnique*) y
 * `attentionSettings` (findUnique/upsert). No requiere conexión a BD.
 */
import { randomUUID } from "node:crypto"
import type { AttentionItem, AttentionSettings } from "@prisma/client"

export interface AttentionSettingsRow {
  storeId: string
  enabledTypes: string | null
  minPriority: string
  quietHoursStart: string | null
  quietHoursEnd: string | null
}

type WhereClause = Record<string, unknown>

export function matchesWhere(row: AttentionItem | AttentionSettings, where: WhereClause): boolean {
  for (const [key, value] of Object.entries(where)) {
    if (key === "OR") {
      if (!Array.isArray(value)) continue
      const matched = (value as WhereClause[]).some((clause) => matchesWhere(row, clause))
      if (!matched) return false
      continue
    }
    if (key === "status" || key === "dedupeKey") {
      const clause = value as { in?: string[] } | string
      if (typeof clause === "string") {
        if (row[key as "status"] !== clause) return false
      } else if (Array.isArray(clause.in)) {
        if (!clause.in.includes(row[key as "status"])) return false
      }
      continue
    }
    if (key === "storeId" || key === "type" || key === "priority" || key === "id" || key === "entityId") {
      if (row[key] !== value) return false
      continue
    }
    if (key === "title" || key === "description") {
      const term = (value as { contains?: string; mode?: string }).contains
      if (term && !String(row[key]).toLowerCase().includes(term.toLowerCase())) return false
      continue
    }
    // Campos no soportados: se ignoran (fail-safe).
  }
  return true
}

export function makeFakeDb() {
  const items: AttentionItem[] = []
  const settings: AttentionSettingsRow[] = []

  const attentionItem = {
    async findMany(args: { where?: WhereClause; orderBy?: Record<string, string>; take?: number; select?: Record<string, boolean> }) {
      const where = args.where ?? {}
      let rows = items.filter((row) => matchesWhere(row, where))
      if (args.take !== undefined) rows = rows.slice(0, args.take)
      const sorted = [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      if (args.select) {
        return sorted.map((row) => {
          const out: Record<string, unknown> = {}
          for (const field of Object.keys(args.select as Record<string, boolean>)) out[field] = row[field as keyof AttentionItem]
          return out
        }) as never
      }
      return sorted
    },
    async create(args: { data: Omit<AttentionItem, "id" | "createdAt" | "updatedAt"> & { createdAt?: Date; updatedAt?: Date } }) {
      const now = new Date()
      const row: AttentionItem = {
        id: randomUUID(),
        createdAt: args.data.createdAt ?? now,
        updatedAt: args.data.updatedAt ?? now,
        resolvedAt: args.data.resolvedAt ?? null,
        snoozedUntil: args.data.snoozedUntil ?? null,
        recommendation: args.data.recommendation ?? null,
        action: args.data.action ?? null,
        metadata: args.data.metadata ?? null,
        source: args.data.source ?? "detector",
        createdBy: args.data.createdBy ?? null,
        ...args.data,
      } as AttentionItem
      items.push(row)
      return row
    },
    async update(args: { where: { id: string }; data: Partial<AttentionItem> }) {
      const row = items.find((r) => r.id === args.where.id)
      if (!row) throw new Error("AttentionItem no encontrado")
      Object.assign(row, args.data, { updatedAt: new Date() })
      return row
    },
    async updateMany(args: { where: WhereClause; data: Partial<AttentionItem> }) {
      const rows = items.filter((row) => matchesWhere(row, args.where))
      for (const row of rows) Object.assign(row, args.data, { updatedAt: new Date() })
      return { count: rows.length }
    },
    async findUnique(args: { where: { id: string } }) {
      return items.find((r) => r.id === args.where.id) ?? null
    },
    async findUniqueOrThrow(args: { where: { id: string } }) {
      const row = items.find((r) => r.id === args.where.id)
      if (!row) throw new Error("AttentionItem no encontrado")
      return row
    },
  }

  const attentionSettings = {
    async findUnique(args: { where: { storeId: string } }) {
      const row = settings.find((r) => r.storeId === args.where.storeId)
      if (!row) return null
      return row as unknown as AttentionSettings
    },
    async upsert(args: {
      where: { storeId: string }
      create: Omit<AttentionSettings, "id" | "createdAt" | "updatedAt">
      update: Partial<AttentionSettings>
    }) {
      let row = settings.find((r) => r.storeId === args.where.storeId)
      const now = new Date()
      if (!row) {
        row = {
          storeId: args.create.storeId,
          enabledTypes: args.create.enabledTypes ?? "[]",
          minPriority: args.create.minPriority ?? "low",
          quietHoursStart: args.create.quietHoursStart ?? null,
          quietHoursEnd: args.create.quietHoursEnd ?? null,
        }
        settings.push(row)
      } else {
        Object.assign(row, args.update)
      }
      return { ...row, id: randomUUID(), createdAt: now, updatedAt: now } as unknown as AttentionSettings
    },
  }

  return {
    attentionItem,
    attentionSettings,
    _debug: { items, settings },
  }
}

export type FakeDb = ReturnType<typeof makeFakeDb>
