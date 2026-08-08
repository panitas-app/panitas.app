/**
 * Preferencias de Inteligencia Financiera (FASE 6D).
 *
 * La memoria estable del negocio guarda qué período revisa más el dueño
 * (`bm.preference.finanzas.periodo`), qué indicadores consulta con más
 * frecuencia (`bm.preference.finanzas.indicadores`) y qué visualización
 * prefiere (`bm.preference.finanzas.visualizacion`). Los dos primeros se
 * aprenden por repetición (umbral `preference` = 3), la última se persiste
 * explícitamente desde el panel de finanzas.
 */
import type { BusinessMemoryEngine } from "./memory-engine"
import type { MemoryContext } from "@/lib/agent/memory"

export const FINANCIAL_PREF_PERIOD_KEY = "bm.preference.finanzas.periodo"
export const FINANCIAL_PREF_INDICATORS_KEY = "bm.preference.finanzas.indicadores"
export const FINANCIAL_PREF_VISUALIZATION_KEY = "bm.preference.finanzas.visualizacion"

export const FINANCIAL_PREF_KEYS = {
  periodo: FINANCIAL_PREF_PERIOD_KEY,
  indicadores: FINANCIAL_PREF_INDICATORS_KEY,
  visualizacion: FINANCIAL_PREF_VISUALIZATION_KEY,
}

export type FinancialVisualization = "resumen" | "indicadores" | "insights"

export interface FinancialPrefs {
  /** Período favorito del panel (`today`, `week`, `month`). */
  favoritePeriod: string | null
  /** Indicadores más consultados (p. ej. `flujo`, `por_cobrar`). */
  indicatorFocus: string | null
  /** Visualización preferida del panel. */
  visualization: FinancialVisualization
}

export interface FinancialUsageSignal {
  period?: string
  indicators?: string[]
}

export const DEFAULT_FINANCIAL_PREFS: FinancialPrefs = {
  favoritePeriod: null,
  indicatorFocus: null,
  visualization: "resumen",
}

function parsePref(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

/** Lee las preferencias financieras aprendidas por el negocio. */
export async function readFinancialPreferences(
  engine: BusinessMemoryEngine,
  ctx: MemoryContext,
): Promise<FinancialPrefs> {
  const [period, indicators, visualization] = await Promise.all([
    engine.get(ctx, FINANCIAL_PREF_PERIOD_KEY),
    engine.get(ctx, FINANCIAL_PREF_INDICATORS_KEY),
    engine.get(ctx, FINANCIAL_PREF_VISUALIZATION_KEY),
  ])
  const viz = parsePref(visualization?.value)
  return {
    favoritePeriod: parsePref(period?.value),
    indicatorFocus: parsePref(indicators?.value),
    visualization:
      viz === "resumen" || viz === "indicadores" || viz === "insights"
        ? viz
        : DEFAULT_FINANCIAL_PREFS.visualization,
  }
}

/** Aprende por repetición el uso del panel financiero (período/indicadores). */
export async function recordFinancialUsage(
  engine: BusinessMemoryEngine,
  ctx: MemoryContext,
  signal: FinancialUsageSignal,
): Promise<void> {
  const observations: Array<{ key: string; label: string; value: string }> = []
  if (signal.period) {
    observations.push({
      key: FINANCIAL_PREF_PERIOD_KEY,
      label: "Período financiero favorito",
      value: signal.period,
    })
  }
  if (signal.indicators && signal.indicators.length > 0) {
    observations.push({
      key: FINANCIAL_PREF_INDICATORS_KEY,
      label: "Indicadores financieros más consultados",
      value: signal.indicators.join(","),
    })
  }
  await Promise.all(
    observations.map((obs) =>
      engine.observe(ctx, {
        key: obs.key,
        kind: "preference",
        label: obs.label,
        value: obs.value,
        domain: "finanzas",
        tags: ["finanzas", "preferencia", "panel financiero"],
        explicit: false,
        ctx: { ...ctx, userId: ctx.userId },
      }),
    ),
  )
}

/** Guarda explícitamente la visualización preferida del panel financiero. */
export async function saveFinancialVisualization(
  engine: BusinessMemoryEngine,
  ctx: MemoryContext,
  visualization: FinancialVisualization,
): Promise<void> {
  const existing = await engine.get(ctx, FINANCIAL_PREF_VISUALIZATION_KEY)
  if (existing && String(existing.value) === visualization) return
  await engine.observe(ctx, {
    key: FINANCIAL_PREF_VISUALIZATION_KEY,
    kind: "preference",
    label: "Visualización del panel financiero",
    value: visualization,
    domain: "finanzas",
    tags: ["finanzas", "preferencia", "panel financiero"],
    explicit: true,
    importance: "LOW",
    ctx: { ...ctx, userId: ctx.userId },
  })
}
