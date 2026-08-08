/**
 * Preferencias del asistente de cobranza inteligente (FASE 6B).
 *
 * La memoria estable del negocio guarda qué categoría de plantilla usa más el
 * comercio (`bm.preference.collection.plantilla`), qué método de pago comparte
 * más en sus recordatorios, qué nivel de cobranza prefiere y en qué orden
 * trabaja sus vencidos. Se aprenden por repetición (umbral `preference` = 3),
 * igual que el resto de la Business Memory.
 */
import type { BusinessMemoryEngine } from "./memory-engine"
import type { MemoryContext } from "@/lib/agent/memory"

export const COLLECTION_PREF_TEMPLATE_KEY = "bm.preference.collection.plantilla"
export const COLLECTION_PREF_METHOD_KEY = "bm.preference.collection.metodo"
export const COLLECTION_PREF_LEVEL_KEY = "bm.preference.collection.nivel"
export const COLLECTION_PREF_ORDER_KEY = "bm.preference.collection.orden"

export const COLLECTION_PREF_KEYS = {
  plantilla: COLLECTION_PREF_TEMPLATE_KEY,
  metodo: COLLECTION_PREF_METHOD_KEY,
  nivel: COLLECTION_PREF_LEVEL_KEY,
  orden: COLLECTION_PREF_ORDER_KEY,
}

export interface CollectionPrefs {
  /** Categoría de plantilla favorita (`primer_recordatorio`, `ultimo_aviso`, ...). */
  favoriteCategory: string | null
  /** Método de pago que más se comparte en los recordatorios. */
  favoriteMethod: string | null
  /** Nivel de cobranza preferido (1, 2 o 3). */
  preferredLevel: number | null
  /** Orden de trabajo: `vencidos_primero` | `solo_vencidos` | `todos` | null. */
  workOrder: string | null
}

export interface CollectionUsageSignal {
  category?: string
  method?: string
  level?: number
}

export const DEFAULT_COLLECTION_PREFS: CollectionPrefs = {
  favoriteCategory: null,
  favoriteMethod: null,
  preferredLevel: null,
  workOrder: null,
}

function parsePref(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function parseLevel(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isInteger(n) && n >= 1 && n <= 3 ? n : null
}

/** Lee las preferencias de cobranza aprendidas por el negocio. */
export async function readCollectionPreferences(
  engine: BusinessMemoryEngine,
  ctx: MemoryContext,
): Promise<CollectionPrefs> {
  const [category, method, level, order] = await Promise.all([
    engine.get(ctx, COLLECTION_PREF_TEMPLATE_KEY),
    engine.get(ctx, COLLECTION_PREF_METHOD_KEY),
    engine.get(ctx, COLLECTION_PREF_LEVEL_KEY),
    engine.get(ctx, COLLECTION_PREF_ORDER_KEY),
  ])
  return {
    favoriteCategory: parsePref(category?.value),
    favoriteMethod: parsePref(method?.value),
    preferredLevel: parseLevel(level?.value),
    workOrder: parsePref(order?.value),
  }
}

/** Aprende por repetición un uso del asistente de cobranza (categoría/método/nivel). */
export async function recordCollectionUsage(
  engine: BusinessMemoryEngine,
  ctx: MemoryContext,
  signal: CollectionUsageSignal,
): Promise<void> {
  const observations: Array<{ key: string; label: string; value: string }> = []
  if (signal.category) {
    observations.push({
      key: COLLECTION_PREF_TEMPLATE_KEY,
      label: "Categoría de plantilla favorita en cobranza",
      value: signal.category,
    })
  }
  if (signal.method) {
    observations.push({
      key: COLLECTION_PREF_METHOD_KEY,
      label: "Método de pago más compartido en cobranza",
      value: signal.method,
    })
  }
  if (signal.level !== undefined) {
    observations.push({
      key: COLLECTION_PREF_LEVEL_KEY,
      label: "Nivel de cobranza preferido",
      value: String(signal.level),
    })
  }
  await Promise.all(
    observations.map((obs) =>
      engine.observe(ctx, {
        key: obs.key,
        kind: "preference",
        label: obs.label,
        value: obs.value,
        domain: "cobranza",
        tags: ["cobranza", "preferencia", "asistente de cobranza"],
        explicit: false,
        ctx: { ...ctx, userId: ctx.userId },
      }),
    ),
  )
}

/** Guarda explícitamente el orden de trabajo de los vencidos. */
export async function saveCollectionWorkOrder(
  engine: BusinessMemoryEngine,
  ctx: MemoryContext,
  order: string,
): Promise<void> {
  const existing = await engine.get(ctx, COLLECTION_PREF_ORDER_KEY)
  if (existing && String(existing.value) === order) return
  await engine.observe(ctx, {
    key: COLLECTION_PREF_ORDER_KEY,
    kind: "preference",
    label: "Orden de trabajo de cobranza",
    value: order,
    domain: "cobranza",
    tags: ["cobranza", "preferencia", "orden de trabajo"],
    explicit: true,
    importance: "LOW",
    ctx: { ...ctx, userId: ctx.userId },
  })
}
