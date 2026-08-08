/**
 * Preferencias del Centro de Conversaciones (FASE 7A).
 *
 * La memoria estable del negocio guarda los canales favoritos del inbox
 * (`bm.preference.inbox.canales`), las etiquetas utilizadas
 * (`bm.preference.inbox.etiquetas`), las conversaciones importantes
 * (`bm.preference.inbox.importantes`) y la preferencia de atención
 * (`bm.preference.inbox.orden`). Las primeras se aprenden por repetición
 * (umbral `preference` = 3); el orden se persiste explícitamente desde la UI.
 */
import type { BusinessMemoryEngine } from "./memory-engine"
import type { MemoryContext } from "@/lib/agent/memory"

export const INBOX_PREF_CHANNELS_KEY = "bm.preference.inbox.canales"
export const INBOX_PREF_TAGS_KEY = "bm.preference.inbox.etiquetas"
export const INBOX_PREF_IMPORTANT_KEY = "bm.preference.inbox.importantes"
export const INBOX_PREF_SORT_KEY = "bm.preference.inbox.orden"

export const INBOX_PREF_KEYS = {
  canales: INBOX_PREF_CHANNELS_KEY,
  etiquetas: INBOX_PREF_TAGS_KEY,
  importantes: INBOX_PREF_IMPORTANT_KEY,
  orden: INBOX_PREF_SORT_KEY,
}

export const INBOX_SORTS = ["recientes", "no_leidas", "pendientes"] as const
export type InboxSort = (typeof INBOX_SORTS)[number]

export interface InboxPrefs {
  /** Canales favoritos del negocio (tipos: whatsapp, instagram...). */
  favoriteChannels: string[]
  /** Etiquetas que más usa para clasificar conversaciones. */
  usedTags: string[]
  /** Conversaciones marcadas como importantes por el negocio. */
  importantConversations: string[]
  /** Preferencia de atención: cómo ordena la bandeja. */
  sort: InboxSort
}

export interface InboxUsageSignal {
  channel?: string
  tag?: string
  conversationId?: string
}

export const DEFAULT_INBOX_PREFS: InboxPrefs = {
  favoriteChannels: [],
  usedTags: [],
  importantConversations: [],
  sort: "recientes",
}

function parseList(value: unknown): string[] {
  if (typeof value !== "string" || !value.trim()) return []
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 20)
}

function parseSort(value: unknown): InboxSort {
  return typeof value === "string" && (INBOX_SORTS as readonly string[]).includes(value)
    ? (value as InboxSort)
    : DEFAULT_INBOX_PREFS.sort
}

/** Lee las preferencias de atención aprendidas por el negocio. */
export async function readInboxPreferences(
  engine: BusinessMemoryEngine,
  ctx: MemoryContext,
): Promise<InboxPrefs> {
  const [channels, tags, important, sort] = await Promise.all([
    engine.get(ctx, INBOX_PREF_CHANNELS_KEY),
    engine.get(ctx, INBOX_PREF_TAGS_KEY),
    engine.get(ctx, INBOX_PREF_IMPORTANT_KEY),
    engine.get(ctx, INBOX_PREF_SORT_KEY),
  ])
  return {
    favoriteChannels: parseList(channels?.value),
    usedTags: parseList(tags?.value),
    importantConversations: parseList(important?.value),
    sort: parseSort(sort?.value),
  }
}

function mergeList(current: string[], value: string | undefined): string[] {
  if (!value) return current
  const next = [value, ...current.filter((v) => v !== value)]
  return next.slice(0, 20)
}

/** Aprende por repetición el uso del inbox (canal, etiqueta, conversación importante). */
export async function recordInboxUsage(
  engine: BusinessMemoryEngine,
  ctx: MemoryContext,
  signal: InboxUsageSignal,
): Promise<void> {
  const observations: Array<{ key: string; label: string; value: string; listKey: string }> = []
  if (signal.channel) {
    observations.push({
      key: INBOX_PREF_CHANNELS_KEY,
      listKey: "canales",
      label: "Canales favoritos del inbox",
      value: signal.channel,
    })
  }
  if (signal.tag) {
    observations.push({
      key: INBOX_PREF_TAGS_KEY,
      listKey: "etiquetas",
      label: "Etiquetas utilizadas en el inbox",
      value: signal.tag,
    })
  }
  if (signal.conversationId) {
    observations.push({
      key: INBOX_PREF_IMPORTANT_KEY,
      listKey: "importantes",
      label: "Conversaciones importantes del inbox",
      value: signal.conversationId,
    })
  }
  if (observations.length === 0) return

  // Fusiona con el valor previo para que `observe` reciba la lista acumulada.
  await Promise.all(
    observations.map(async (obs) => {
      const existing = await engine.get(ctx, obs.key)
      const merged = mergeList(parseList(existing?.value), obs.value)
      await engine.observe(ctx, {
        key: obs.key,
        kind: "preference",
        label: obs.label,
        value: merged.join(","),
        domain: "inbox",
        tags: ["inbox", "preferencia", "centro de conversaciones"],
        explicit: false,
        ctx: { ...ctx, userId: ctx.userId },
      })
    }),
  )
}

/** Guarda explícitamente la preferencia de atención (orden de la bandeja). */
export async function saveInboxSort(
  engine: BusinessMemoryEngine,
  ctx: MemoryContext,
  sort: InboxSort,
): Promise<void> {
  const existing = await engine.get(ctx, INBOX_PREF_SORT_KEY)
  if (existing && String(existing.value) === sort) return
  await engine.observe(ctx, {
    key: INBOX_PREF_SORT_KEY,
    kind: "preference",
    label: "Orden de la bandeja de conversaciones",
    value: sort,
    domain: "inbox",
    tags: ["inbox", "preferencia", "centro de conversaciones"],
    explicit: true,
    importance: "LOW",
    ctx: { ...ctx, userId: ctx.userId },
  })
}
