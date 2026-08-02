/**
 * Capa central de features por plan.
 *
 * API pública de FASE 2B. Ningún componente debe validar planes directamente;
 * todo pasa por aquí (`hasFeature`, `requireFeature`, ...).
 *
 * Uso:
 *   hasFeature(current.store.planType, "unified_chat")        // string legacy
 *   hasFeature({ planType: store.planType }, "unified_chat")  // contexto
 *   requireFeature(getNegocioActivo(), "unified_chat")        // en rutas/servidor
 */

import { FEATURE_ALIASES, FEATURES, PLAN_FEATURES, PLANS, featureGroup } from "./catalog"
import { getActivePlans, getPlanBySlug, normalizePlanSlug, toPlanSlug } from "./resolve"
import type { FeatureAccess, FeatureDefinition, FeatureGroup, FeatureKey, FeatureRequirement, PlanContext, PlanDefinition, PlanLimits, PlanSlug } from "./types"

export type {
  FeatureAccess,
  FeatureDefinition,
  FeatureGroup,
  FeatureKey,
  FeatureRequirement,
  PlanContext,
  PlanDefinition,
  PlanLimits,
  PlanSlug,
}
export { FEATURES, FEATURE_ALIASES, PLAN_FEATURES, PLANS, featureGroup }

export type PlanRef = string | PlanContext | Record<string, unknown> | null | undefined

/** Normaliza una feature usando los alias de FASE 2A (store, conversations, ai_sales). */
function normalizeFeature(feature: string): FeatureKey {
  const key = feature.trim() as FeatureKey
  if (key in FEATURES) return key
  const alias = FEATURE_ALIASES[feature.trim()]
  if (alias) return alias
  return feature.trim() as FeatureKey
}

function isKnownFeature(feature: string): boolean {
  return feature in FEATURES || feature in FEATURE_ALIASES
}

/** Plan al que pertenece una feature (primer plan activo que la incluye). */
export function planForFeature(feature: FeatureKey): PlanSlug {
  if (PLAN_FEATURES.business_plus.includes(feature) && !PLAN_FEATURES.business.includes(feature)) return "business_plus"
  return "business"
}

/** Devuelve el plan al que pertenece la referencia. */
export function getPlan(ref: PlanRef): PlanDefinition {
  return getPlanBySlug(toPlanSlug(ref))
}

/** Devuelve el slug del plan. */
export function getPlanSlug(ref: PlanRef): PlanSlug {
  return toPlanSlug(ref)
}

/** Devuelve la lista de features del plan. */
export function getPlanFeatures(ref: PlanRef): FeatureKey[] {
  return PLAN_FEATURES[toPlanSlug(ref)]
}

/** Devuelve los límites declarados del plan (no aplicados en 2B). */
export function getPlanLimits(ref: PlanRef): PlanLimits {
  return PLANS[toPlanSlug(ref)].limits
}

/** True si la referencia corresponde a Panitas Negocios Plus. */
export function isBusinessPlus(ref: PlanRef): boolean {
  return toPlanSlug(ref) === "business_plus"
}

/** True si la referencia corresponde a Panitas Negocios (base). */
export function isBusiness(ref: PlanRef): boolean {
  return toPlanSlug(ref) === "business"
}

/** Verifica si un plan tiene una feature. Lanza si la feature no existe. */
export function hasFeature(ref: PlanRef, feature: string): boolean {
  const key = normalizeFeature(feature)
  if (!isKnownFeature(feature)) {
    throw new Error(`Feature desconocida: "${feature}". Revisa src/lib/features/catalog.ts`)
  }
  return PLAN_FEATURES[toPlanSlug(ref)].includes(key)
}

/** Versión segura de `hasFeature`: no lanza, devuelve `FeatureAccess`. */
export function tryHasFeature(ref: PlanRef, feature: string): FeatureAccess {
  const slug = toPlanSlug(ref)
  const key = normalizeFeature(feature)
  if (!isKnownFeature(feature)) {
    return { allowed: false, plan: slug, feature: key, reason: "unknown_feature", requiredPlan: "business_plus" }
  }
  if (!PLANS[slug].active) {
    return { allowed: false, plan: slug, feature: key, reason: "plan_inactive", requiredPlan: "business_plus" }
  }
  if (!PLAN_FEATURES[slug].includes(key)) {
    return { allowed: false, plan: slug, feature: key, reason: "not_in_plan", requiredPlan: planForFeature(key) }
  }
  return { allowed: true, plan: slug, feature: key }
}

/** Guarda de ruta/servidor: devuelve `{ allowed, error }` sin lanzar. */
export function requireFeature(ref: PlanRef, feature: string): FeatureRequirement {
  const access = tryHasFeature(ref, feature)
  if (access.allowed) return { allowed: true }
  return {
    allowed: false,
    error: `La función "${FEATURES[access.feature]?.name ?? access.feature}" no está incluida en tu plan actual.`,
    requiredPlan: access.requiredPlan,
  }
}

/** Nombre legible de una feature. */
export function featureLabel(feature: string): string {
  const key = normalizeFeature(feature)
  return FEATURES[key]?.name ?? feature
}

/** Descripción legible de una feature. */
export function featureDescription(feature: string): string {
  const key = normalizeFeature(feature)
  return FEATURES[key]?.description ?? ""
}

export { getActivePlans, normalizePlanSlug }
