/**
 * Preferencias del Centro de Cobranza (FASE 6A).
 *
 * Persisten la vista del usuario (filtro activo y búsqueda) en la memoria
 * estable del negocio (`bm.preference.creditos.*`) para que, al volver a la
 * pantalla, el panel recupere exactamente dónde estaba. Frontera por store.
 */
import type { BusinessMemoryEngine } from "./memory-engine"
import type { MemoryContext } from "@/lib/agent/memory"

export const CREDIT_PREF_FILTER_KEY = "bm.preference.creditos.filtro"
export const CREDIT_PREF_SEARCH_KEY = "bm.preference.creditos.busqueda"

export interface CreditViewPrefs {
  filter: string
  search: string
}

export const DEFAULT_CREDIT_VIEW_PREFS: CreditViewPrefs = { filter: "all", search: "" }

function parsePref(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback
}

/** Lee las preferencias guardadas del centro de cobranza. */
export async function readCreditPreferences(engine: BusinessMemoryEngine, ctx: MemoryContext): Promise<CreditViewPrefs> {
  const [filterItem, searchItem] = await Promise.all([
    engine.get(ctx, CREDIT_PREF_FILTER_KEY),
    engine.get(ctx, CREDIT_PREF_SEARCH_KEY),
  ])
  return {
    filter: parsePref(filterItem?.value, DEFAULT_CREDIT_VIEW_PREFS.filter),
    search: parsePref(searchItem?.value, DEFAULT_CREDIT_VIEW_PREFS.search),
  }
}

/** Guarda las preferencias de vista del centro de cobranza (explicitas). */
export async function saveCreditPreferences(
  engine: BusinessMemoryEngine,
  ctx: MemoryContext,
  prefs: CreditViewPrefs,
): Promise<void> {
  const put = async (key: string, label: string, value: string): Promise<void> => {
    const existing = await engine.get(ctx, key)
    if (existing && String(existing.value) === value) return
    await engine.observe(ctx, {
      key,
      kind: "preference",
      label,
      value,
      domain: "cobranza",
      tags: ["cobranza", "preferencia", "centro de cobranza"],
      explicit: true,
      ctx: { ...ctx, userId: ctx.userId },
      importance: "LOW",
    })
  }
  await Promise.all([
    put(CREDIT_PREF_FILTER_KEY, "Filtro del centro de cobranza", prefs.filter),
    put(CREDIT_PREF_SEARCH_KEY, "Búsqueda del centro de cobranza", prefs.search),
  ])
}
