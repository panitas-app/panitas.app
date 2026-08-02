import type { PlanContext, PlanSlug } from "./types"
import { PLANS } from "./catalog"

/** Valores de `Store.planType` / `Negocio.planId` / `Store.plan` que mapean a BUSINESS_PLUS. */
const PLUS_ALIASES = new Set([
  "business_plus",
  "negocios_plus",
  "negocios-plus",
  "plus",
  "advanced",
  "empresarial",
  "mayorista",
  "empresa",
  "business-plus",
  "pro",
])

/** Normaliza cualquier referencia de plan a un `PlanSlug` canónico.
 * Regla de seguridad: cualquier valor desconocido cae a `business`
 * (nunca se deniega más de lo debido a un plan no reconocido). */
export function normalizePlanSlug(input: string | null | undefined): PlanSlug {
  if (!input) return "business"
  const value = String(input).trim().toLowerCase().replace(/[\s_]+/g, "-")
  if (PLUS_ALIASES.has(value)) return "business_plus"
  return "business"
}

/** Extrae el valor de plan desde una referencia (string, PlanContext u objeto con plan/planType/planId). */
export function toPlanSlug(ref: string | PlanContext | Record<string, unknown> | null | undefined): PlanSlug {
  if (ref == null) return "business"
  if (typeof ref === "string") return normalizePlanSlug(ref)

  const ctx = ref as PlanContext
  if (ctx.planSlug) return normalizePlanSlug(ctx.planSlug)
  const candidate = ctx.planType ?? ctx.plan ?? ctx.planId
  return normalizePlanSlug(candidate)
}

/** Valida que un slug sea un plan registrado. */
export function isPlanSlug(value: unknown): value is PlanSlug {
  return typeof value === "string" && (value === "business" || value === "business_plus")
}

/** Devuelve la definición del plan para un slug. */
export function getPlanBySlug(slug: PlanSlug) {
  return PLANS[slug]
}

/** Lista de planes activos ordenados por precio (para páginas públicas). */
export function getActivePlans(): Array<{ slug: PlanSlug } & (typeof PLANS)[PlanSlug]> {
  return [PLANS.business, PLANS.business_plus].filter((p) => p.active)
}
