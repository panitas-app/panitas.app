/**
 * Preferencias del Centro de Proveedores (FASE 6C).
 *
 * La memoria estable del negocio guarda qué categoría de proveedor usa más
 * (`bm.preference.proveedores.categoria`), qué método de pago emplea para
 * pagar a sus proveedores (`bm.preference.proveedores.metodo`) y en qué
 * estado/filtro deja el panel (`bm.preference.proveedores.filtro`). Las dos
 * primeras se aprenden por repetición (umbral `preference` = 3), la última se
 * persiste explícitamente desde el centro de proveedores.
 */
import type { BusinessMemoryEngine } from "./memory-engine"
import type { MemoryContext } from "@/lib/agent/memory"

export const SUPPLIER_PREF_CATEGORY_KEY = "bm.preference.proveedores.categoria"
export const SUPPLIER_PREF_METHOD_KEY = "bm.preference.proveedores.metodo"
export const SUPPLIER_PREF_FILTER_KEY = "bm.preference.proveedores.filtro"

export const SUPPLIER_PREF_KEYS = {
  categoria: SUPPLIER_PREF_CATEGORY_KEY,
  metodo: SUPPLIER_PREF_METHOD_KEY,
  filtro: SUPPLIER_PREF_FILTER_KEY,
}

export interface SupplierPrefs {
  /** Categoría de proveedor favorita (`abarrotes`, `tecnologia`, ...). */
  favoriteCategory: string | null
  /** Método de pago que más se usa con proveedores. */
  favoriteMethod: string | null
  /** Filtro/estado activo del centro de proveedores (`all`, `vencido`, ...). */
  filter: string
}

export interface SupplierUsageSignal {
  category?: string
  method?: string
}

export const DEFAULT_SUPPLIER_PREFS: SupplierPrefs = {
  favoriteCategory: null,
  favoriteMethod: null,
  filter: "all",
}

function parsePref(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

/** Lee las preferencias de proveedores aprendidas por el negocio. */
export async function readSupplierPreferences(
  engine: BusinessMemoryEngine,
  ctx: MemoryContext,
): Promise<SupplierPrefs> {
  const [category, method, filter] = await Promise.all([
    engine.get(ctx, SUPPLIER_PREF_CATEGORY_KEY),
    engine.get(ctx, SUPPLIER_PREF_METHOD_KEY),
    engine.get(ctx, SUPPLIER_PREF_FILTER_KEY),
  ])
  return {
    favoriteCategory: parsePref(category?.value),
    favoriteMethod: parsePref(method?.value),
    filter: parsePref(filter?.value) ?? DEFAULT_SUPPLIER_PREFS.filter,
  }
}

/** Aprende por repetición un uso del centro de proveedores (categoría/método). */
export async function recordSupplierUsage(
  engine: BusinessMemoryEngine,
  ctx: MemoryContext,
  signal: SupplierUsageSignal,
): Promise<void> {
  const observations: Array<{ key: string; label: string; value: string }> = []
  if (signal.category) {
    observations.push({
      key: SUPPLIER_PREF_CATEGORY_KEY,
      label: "Categoría de proveedor favorita",
      value: signal.category,
    })
  }
  if (signal.method) {
    observations.push({
      key: SUPPLIER_PREF_METHOD_KEY,
      label: "Método de pago más usado con proveedores",
      value: signal.method,
    })
  }
  await Promise.all(
    observations.map((obs) =>
      engine.observe(ctx, {
        key: obs.key,
        kind: "preference",
        label: obs.label,
        value: obs.value,
        domain: "proveedores",
        tags: ["proveedores", "preferencia", "centro de proveedores"],
        explicit: false,
        ctx: { ...ctx, userId: ctx.userId },
      }),
    ),
  )
}

/** Guarda explícitamente el filtro activo del centro de proveedores. */
export async function saveSupplierFilter(
  engine: BusinessMemoryEngine,
  ctx: MemoryContext,
  filter: string,
): Promise<void> {
  const existing = await engine.get(ctx, SUPPLIER_PREF_FILTER_KEY)
  if (existing && String(existing.value) === filter) return
  await engine.observe(ctx, {
    key: SUPPLIER_PREF_FILTER_KEY,
    kind: "preference",
    label: "Filtro del centro de proveedores",
    value: filter,
    domain: "proveedores",
    tags: ["proveedores", "preferencia", "centro de proveedores"],
    explicit: true,
    importance: "LOW",
    ctx: { ...ctx, userId: ctx.userId },
  })
}
