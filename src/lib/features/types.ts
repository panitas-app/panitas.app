/**
 * Tipos del sistema de planes y features de Panitas.
 *
 * Esta capa es una librería pura (sin Prisma ni Next) para que los tests
 * unitarios sean rápidos. El catálogo vive en `catalog.ts` y el único punto
 * que resuelve el plan real de un negocio es `resolve.ts`.
 */

/** Planes canónicos de Panitas Negocios 2.0. */
export type PlanSlug = "business" | "business_plus"

/** Features disponibles en la plataforma (catálogo BUSINESS / BUSINESS_PLUS). */
export type FeatureKey =
  | "inventory"
  | "pos"
  | "crm"
  | "online_store"
  | "reports"
  | "basic_ai"
  | "knowledge_base"
  | "unified_chat"
  | "whatsapp_inbox"
  | "instagram_inbox"
  | "facebook_inbox"
  | "ai_reply_suggestions"
  | "customer_analysis"
  | "sales_opportunities"
  | "attention_center"
  | "public_api"

/** Agrupaciones visuales de las features (para páginas públicas). */
export type FeatureGroup = "core" | "communication" | "ai" | "knowledge"

/** Límites declarados por plan. `null` = ilimitado. Se preparan para fases
 * futuras; NO se aplican todavía en 2B. */
export interface PlanLimits {
  /** Máximo de productos. */
  products: number | null
  /** Miembros del equipo (admins/gestores/vendedores). */
  allowedUsers: number | null
  /** Terminales POS simultáneos. */
  posTerminals: number | null
  /** Canales de chat (WhatsApp/Instagram/Facebook). */
  chatChannels: number | null
  /** Conversaciones activas por mes. */
  activeConversationsPerMonth: number | null
  /** Mensajes con respuesta sugerida por IA al mes. */
  aiSuggestedMessagesPerMonth: number | null
  /** Peticiones de IA al mes. */
  aiRequestsPerMonth: number | null
  /** Tickets de soporte activos. */
  activeTickets: number | null
}

/** Definición estática de una feature (para UI y documentación). */
export interface FeatureDefinition {
  key: FeatureKey
  name: string
  description: string
  group: FeatureGroup
}

/** Definición estática de un plan (para UI y documentación). */
export interface PlanDefinition {
  slug: PlanSlug
  name: string
  /** Nombre comercial del plan. */
  displayName: string
  tagline: string
  description: string
  active: boolean
  features: FeatureKey[]
  limits: PlanLimits
}

/** Referencia de plan aceptada por la capa de features. */
export interface PlanContext {
  /** Valor de `Store.plan` (normalmente `"free"`). */
  plan?: string | null
  /** Valor de `Store.planType` (`tienda`, `agenda`, `empresa`...). */
  planType?: string | null
  /** Valor de `Negocio.planId` o su `nombre`. */
  planId?: string | null
  /** Slug resuelto (si ya se conoce). */
  planSlug?: PlanSlug | null
}

/** Resultado de una consulta de acceso a feature. */
export interface FeatureAccess {
  allowed: boolean
  plan: PlanSlug
  feature: FeatureKey
  /** Motivo de denegación. */
  reason?: "not_in_plan" | "unknown_feature" | "plan_inactive"
  /** Plan que otorga la feature (para el CTA de upgrade). */
  requiredPlan?: PlanSlug
}

/** Resultado de `requireFeature` (estilo `requireAccesoModulo`). */
export interface FeatureRequirement {
  allowed: boolean
  error?: string
  requiredPlan?: PlanSlug
}
