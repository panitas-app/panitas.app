/**
 * Servicio de Atención (FASE 8C).
 *
 * Orquesta el ciclo de vida de los `AttentionItem`:
 *  - `sync`: ejecuta todos los detectors, aplica preferencias, dedupe y
 *    reconciliación (crea/resuelve/reabre automáticamente).
 *  - `list`/`group`/`overview`: consultas del centro de atención (siempre
 *    multi-tenant por `storeId`).
 *  - `acknowledge`/`resolve`/`dismiss`/`snooze`: acciones de estado.
 *
 * Reglas de dedupe:
 *  - Un item abierto (new/acknowledged/snoozed) con la misma `dedupeKey`
 *    impide crear otro mientras la situación persista.
 *  - Un item `resolved` libera la key: si la situación reaparece, se crea uno
 *    nuevo (nueva ocurrencia).
 *  - Un item `dismissed` respeta la decisión del usuario: no se recrea mientras
 *    la situación persista.
 *
 * La resolución automática solo ocurre cuando es SEGURO (la situación ya no
 * existe en los datos reales); nunca se resuelve por opinión o predicción.
 */
import type { AttentionItem, PrismaClient } from "@prisma/client"
import { prisma as defaultPrisma } from "@/lib/prisma"
import { createAttentionDataPort, type AttentionDataPort } from "./queries"
import { AttentionPreferencesService, type AttentionPreferences } from "./preferences"
import type { AttentionNotifier } from "./notifier"
import { isWithinQuietHours } from "./notifier"
import {
  detectChannels,
  detectConversations,
  detectCredits,
  detectInventory,
  detectOrders,
  detectSuppliers,
} from "./detectors"
import {
  OPEN_STATUSES,
  isAtLeastPriority,
  rankPriority,
  type AttentionGroup,
  type AttentionItemDTO,
  type AttentionListQuery,
  type AttentionOverview,
  type AttentionPriority,
  type AttentionStatus,
  type AttentionType,
  type Situation,
} from "./types"
import { attentionPluralLabel, ATTENTION_RULES } from "./rules"

export interface AttentionDomainEventPayload {
  type: "attention.item.created" | "attention.item.resolved" | "attention.item.acknowledged" | "attention.item.dismissed" | "attention.item.snoozed"
  storeId: string
  itemId: string
  itemType: string
  priority: string
  actorId?: string
}

export interface AttentionServiceOptions {
  db?: PrismaClient
  dataPort?: AttentionDataPort
  preferences?: AttentionPreferencesService
  notifier?: AttentionNotifier
  /** Sink de eventos de dominio (auditoría/feed). Se inyecta desde la app. */
  onEvent?: (payload: AttentionDomainEventPayload) => void
}

export interface AttentionSyncResult {
  storeId: string
  totalSituations: number
  created: number
  resolved: number
  reopened: number
  skippedExisting: number
  now: string
}

function situationKey(type: AttentionType, entityId: string): string {
  return `${type}:${entityId}`
}

export class AttentionService {
  private readonly db: PrismaClient
  private readonly dataPort: AttentionDataPort
  private readonly preferences: AttentionPreferencesService
  private readonly notifier?: AttentionNotifier
  private readonly onEvent?: (payload: AttentionDomainEventPayload) => void

  constructor(options: AttentionServiceOptions = {}) {
    this.db = options.db ?? defaultPrisma
    this.dataPort = options.dataPort ?? createAttentionDataPort(this.db)
    this.preferences = options.preferences ?? new AttentionPreferencesService(this.db)
    this.notifier = options.notifier
    this.onEvent = options.onEvent
  }

  // ─── Detección y reconciliación ──────────────────────────────────────

  /** Ejecuta todos los detectors y reconcilia los items con la realidad. */
  async sync(storeId: string, now: Date = new Date()): Promise<AttentionSyncResult> {
    const prefs = await this.preferences.get(storeId)

    const [inventory, credits, suppliers, orders, conversations, channels] = await Promise.all([
      this.dataPort.fetchInventory(storeId, now),
      this.dataPort.fetchCredits(storeId),
      this.dataPort.fetchSuppliers(storeId),
      this.dataPort.fetchOrders(storeId),
      this.dataPort.fetchConversations(storeId),
      this.dataPort.fetchChannels(storeId),
    ])

    const detected: Situation[] = [
      ...detectInventory(inventory, now),
      ...detectCredits(credits, now),
      ...detectSuppliers(suppliers, now),
      ...detectOrders(orders, now),
      ...detectConversations(conversations, now),
      ...detectChannels(channels),
    ]

    // Preferencias del negocio: tipos habilitados + prioridad mínima.
    const filtered = detected.filter(
      (s) => prefs.enabledTypes.includes(s.type) && isAtLeastPriority(s.priority, prefs.minPriority),
    )

    // Dedupe en memoria (una situación no puede repetirse en el mismo sync).
    const unique = new Map<string, Situation>()
    for (const situation of filtered) {
      const key = situationKey(situation.type, situation.entityId)
      if (!unique.has(key)) unique.set(key, situation)
    }
    const situations = [...unique.values()]
    const situationKeys = new Set(situations.map((s) => situationKey(s.type, s.entityId)))

    const openItems = await this.db.attentionItem.findMany({
      where: { storeId, status: { in: [...OPEN_STATUSES] } },
    })

    // Último item por dedupeKey (cualquier estado) para respetar dismiss/resolved.
    const latestByKey = await this.latestByKeys(storeId, situationKeys)

    const created: AttentionItem[] = []
    for (const situation of situations) {
      const key = situationKey(situation.type, situation.entityId)
      const latest = latestByKey.get(key)
      if (latest) {
        if (latest.status === "resolved") {
          // Nueva ocurrencia: la situación se había resuelto y volvió.
          const row = await this.createItem(storeId, situation)
          created.push(row)
        }
        // dismissed: se respeta la decisión del usuario.
        // open: ya existe (dedup).
        continue
      }
      const row = await this.createItem(storeId, situation)
      created.push(row)
    }

    const resolved: AttentionItem[] = []
    const reopened: AttentionItem[] = []
    for (const item of openItems) {
      const stillPresent = situationKeys.has(item.dedupeKey)
      if (stillPresent) {
        if (item.status === "snoozed" && item.snoozedUntil && item.snoozedUntil.getTime() <= now.getTime()) {
          const updated = await this.db.attentionItem.update({
            where: { id: item.id },
            data: { status: "new", snoozedUntil: null },
          })
          reopened.push(updated)
          this.emit("attention.item.created", storeId, updated)
        }
        continue
      }
      const updated = await this.db.attentionItem.update({
        where: { id: item.id },
        data: { status: "resolved", resolvedAt: now },
      })
      resolved.push(updated)
      this.emit("attention.item.resolved", storeId, updated)
    }

    return {
      storeId,
      totalSituations: situations.length,
      created: created.length,
      resolved: resolved.length,
      reopened: reopened.length,
      skippedExisting: situations.length - created.length,
      now: now.toISOString(),
    }
  }

  private async latestByKeys(storeId: string, keys: ReadonlySet<string>): Promise<Map<string, AttentionItem>> {
    if (keys.size === 0) return new Map()
    const rows = await this.db.attentionItem.findMany({
      where: { storeId, dedupeKey: { in: [...keys] } },
      orderBy: { createdAt: "desc" },
    })
    const latest = new Map<string, AttentionItem>()
    for (const row of rows) {
      if (!latest.has(row.dedupeKey)) latest.set(row.dedupeKey, row)
    }
    return latest
  }

  private async createItem(storeId: string, situation: Situation): Promise<AttentionItem> {
    // Deep link garantizado para todos los tipos: si el detector no lo definió,
    // se usa la acción del catálogo de reglas (rules.ts).
    const action = situation.action ?? ATTENTION_RULES[situation.type]?.action(situation.entityId)
    const row = await this.db.attentionItem.create({
      data: {
        storeId,
        type: situation.type,
        priority: situation.priority,
        status: "new",
        title: situation.title,
        description: situation.description,
        recommendation: situation.recommendation ?? null,
        source: "detector",
        entityType: situation.entityType,
        entityId: situation.entityId,
        action: action ? JSON.stringify(action) : null,
        metadata: situation.metadata ? JSON.stringify(situation.metadata) : null,
        dedupeKey: situationKey(situation.type, situation.entityId),
      },
    })
    this.emit("attention.item.created", storeId, row)
    await this.notifyNew(storeId, row, { ...situation, action })
    return row
  }

  private async notifyNew(storeId: string, item: AttentionItem, situation: Situation): Promise<void> {
    if (!this.notifier) return
    const prefs = await this.preferences.get(storeId)
    const quietHours = isWithinQuietHours(prefs, new Date())
    await this.notifier.notify(
      {
        storeId,
        itemId: item.id,
        type: item.type as AttentionType,
        priority: item.priority as AttentionPriority,
        title: item.title,
        description: item.description,
        action: situation.action,
      },
      { quietHours },
    )
  }

  private emit(
    type: AttentionDomainEventPayload["type"],
    storeId: string,
    item: AttentionItem,
    actorId?: string,
  ): void {
    this.onEvent?.({
      type,
      storeId,
      itemId: item.id,
      itemType: item.type,
      priority: item.priority,
      actorId,
    })
  }

  // ─── Consultas ───────────────────────────────────────────────────────

  async list(storeId: string, query: AttentionListQuery = {}): Promise<AttentionItemDTO[]> {
    const where = this.buildWhere(storeId, query)
    const rows = await this.db.attentionItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: query.limit ?? 200,
    })
    return rows
      .sort((a, b) => rankPriority(a.priority as AttentionPriority) - rankPriority(b.priority as AttentionPriority) || b.createdAt.getTime() - a.createdAt.getTime())
      .map((row) => toDTO(row))
  }

  async group(storeId: string, query: AttentionListQuery = {}): Promise<AttentionGroup[]> {
    const pageRows = await this.list(storeId, { ...query, status: query.status ?? "open" })
    const allOpenRows = await this.db.attentionItem.findMany({
      where: { storeId, status: { in: [...OPEN_STATUSES] } },
      select: { type: true },
    })
    const totalByType = new Map<string, number>()
    for (const row of allOpenRows) {
      totalByType.set(row.type, (totalByType.get(row.type) ?? 0) + 1)
    }

    const groups = new Map<string, AttentionGroup>()
    for (const dto of pageRows) {
      const group = groups.get(dto.type) ?? {
        type: dto.type,
        label: attentionPluralLabel(dto.type),
        count: 0,
        total: totalByType.get(dto.type) ?? 0,
        priority: dto.priority,
        items: [],
      }
      group.items.push(dto)
      group.count = group.items.length
      if (rankPriority(dto.priority) < rankPriority(group.priority)) group.priority = dto.priority
      groups.set(dto.type, group)
    }

    return [...groups.values()].sort(
      (a, b) => rankPriority(a.priority) - rankPriority(b.priority),
    )
  }

  async overview(storeId: string): Promise<AttentionOverview> {
    const rows = await this.db.attentionItem.findMany({
      where: { storeId, status: { in: [...OPEN_STATUSES] } },
      select: { status: true, priority: true, type: true },
    })

    const overview: AttentionOverview = {
      open: rows.length,
      critical: 0,
      high: 0,
      byStatus: { new: 0, acknowledged: 0, snoozed: 0, resolved: 0, dismissed: 0 },
      byPriority: { critical: 0, high: 0, medium: 0, low: 0 },
      byType: {},
    }

    for (const row of rows) {
      overview.byStatus[row.status as AttentionStatus] += 1
      overview.byPriority[row.priority as AttentionPriority] += 1
      if (row.priority === "critical") overview.critical += 1
      if (row.priority === "high") overview.high += 1
      overview.byType[row.type as AttentionType] = (overview.byType[row.type as AttentionType] ?? 0) + 1
    }

    return overview
  }

  private buildWhere(storeId: string, query: AttentionListQuery) {
    const where: Record<string, unknown> = { storeId }
    if (query.type) where.type = query.type

    if (query.status === "open" || query.status === "active" || query.status === undefined) {
      where.status = { in: [...OPEN_STATUSES] }
    } else {
      where.status = query.status
    }
    if (query.priority) where.priority = query.priority
    if (query.search && query.search.trim()) {
      const term = query.search.trim()
      where.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
      ]
    }
    return where
  }

  // ─── Preferencias del negocio ────────────────────────────────────────

  getPreferences(storeId: string): Promise<AttentionPreferences> {
    return this.preferences.get(storeId)
  }

  updatePreferences(storeId: string, patch: Partial<AttentionPreferences>): Promise<AttentionPreferences> {
    return this.preferences.update(storeId, patch)
  }

  // ─── Acciones de estado (siempre multi-tenant) ───────────────────────
  private async mutate(
    storeId: string,
    itemId: string,
    data: { status: AttentionStatus; resolvedAt?: Date; snoozedUntil?: Date | null },
    eventType: AttentionDomainEventPayload["type"],
    actorId?: string,
  ): Promise<AttentionItemDTO | null> {
    const row = await this.db.attentionItem.updateMany({
      where: { id: itemId, storeId },
      data: { ...data, updatedAt: new Date() },
    })
    if (row.count === 0) return null
    const item = await this.db.attentionItem.findUniqueOrThrow({ where: { id: itemId } })
    this.emit(eventType, storeId, item, actorId)
    return toDTO(item)
  }

  async acknowledge(storeId: string, itemId: string, actorId?: string): Promise<AttentionItemDTO | null> {
    return this.mutate(storeId, itemId, { status: "acknowledged" }, "attention.item.acknowledged", actorId)
  }

  async resolve(storeId: string, itemId: string, actorId?: string): Promise<AttentionItemDTO | null> {
    return this.mutate(storeId, itemId, { status: "resolved", resolvedAt: new Date() }, "attention.item.resolved", actorId)
  }

  async dismiss(storeId: string, itemId: string, actorId?: string): Promise<AttentionItemDTO | null> {
    return this.mutate(storeId, itemId, { status: "dismissed" }, "attention.item.dismissed", actorId)
  }

  async snooze(storeId: string, itemId: string, until: Date, actorId?: string): Promise<AttentionItemDTO | null> {
    return this.mutate(storeId, itemId, { status: "snoozed", snoozedUntil: until }, "attention.item.snoozed", actorId)
  }
}

// ─── Mapeo y helpers ────────────────────────────────────────────────────

export function labelOf(type: string): string {
  return type
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .join(" ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function toDTO(row: AttentionItem): AttentionItemDTO {
  return {
    id: row.id,
    type: row.type as AttentionType,
    priority: row.priority as AttentionPriority,
    status: row.status as AttentionStatus,
    title: row.title,
    description: row.description,
    recommendation: row.recommendation,
    source: (row.source as AttentionItemDTO["source"]) ?? "detector",
    entityType: row.entityType,
    entityId: row.entityId,
    action: parseAction(row.action),
    metadata: parseMetadata(row.metadata),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    snoozedUntil: row.snoozedUntil?.toISOString() ?? null,
  }
}

export function parseAction(raw: string | null): AttentionItemDTO["action"] {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === "object" && typeof (parsed as { href?: unknown }).href === "string") {
      return {
        label: typeof (parsed as { label?: unknown }).label === "string" ? (parsed as { label: string }).label : "Ver",
        href: (parsed as { href: string }).href,
        external: (parsed as { external?: unknown }).external === true,
      }
    }
    return null
  } catch {
    return null
  }
}

export function parseMetadata(raw: string | null): Record<string, unknown> {
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}
