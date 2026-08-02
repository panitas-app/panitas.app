import type { FeatureDefinition, FeatureGroup, FeatureKey, PlanDefinition, PlanLimits, PlanSlug } from "./types"

/** Features del plan base (Panitas Negocios). */
export const BASE_FEATURES: FeatureKey[] = [
  "inventory",
  "pos",
  "crm",
  "online_store",
  "reports",
  "basic_ai",
]

/** Features exclusivas del plan Panitas Negocios Plus. */
export const PLUS_FEATURES: FeatureKey[] = [
  "unified_chat",
  "whatsapp_inbox",
  "instagram_inbox",
  "facebook_inbox",
  "ai_reply_suggestions",
  "customer_analysis",
  "sales_opportunities",
]

/** Catálogo de features con metadatos para UI y documentación. */
export const FEATURES: Record<FeatureKey, FeatureDefinition> = {
  inventory: {
    key: "inventory",
    name: "Inventario",
    description: "Gestión completa de productos, stock y categorías.",
    group: "core",
  },
  pos: {
    key: "pos",
    name: "Punto de venta",
    description: "Cobra y registra ventas desde el punto de venta.",
    group: "core",
  },
  crm: {
    key: "crm",
    name: "CRM de clientes",
    description: "Base de datos de clientes, historial y seguimiento.",
    group: "core",
  },
  online_store: {
    key: "online_store",
    name: "Tienda online",
    description: "Tienda pública con catálogo, carrito y pedidos.",
    group: "core",
  },
  reports: {
    key: "reports",
    name: "Reportes",
    description: "Reportes de ventas, inventario y rendimiento.",
    group: "core",
  },
  basic_ai: {
    key: "basic_ai",
    name: "Asistente IA",
    description: "Asistente de IA consultivo para tu negocio.",
    group: "ai",
  },
  unified_chat: {
    key: "unified_chat",
    name: "Centro de chats",
    description: "Todas las conversaciones de tus canales en una sola bandeja.",
    group: "communication",
  },
  whatsapp_inbox: {
    key: "whatsapp_inbox",
    name: "WhatsApp",
    description: "Atiende WhatsApp desde el centro de chats.",
    group: "communication",
  },
  instagram_inbox: {
    key: "instagram_inbox",
    name: "Instagram",
    description: "Atiende mensajes de Instagram desde el centro de chats.",
    group: "communication",
  },
  facebook_inbox: {
    key: "facebook_inbox",
    name: "Facebook",
    description: "Atiende mensajes de Facebook desde el centro de chats.",
    group: "communication",
  },
  ai_reply_suggestions: {
    key: "ai_reply_suggestions",
    name: "Sugerencias de respuesta IA",
    description: "La IA sugiere respuestas para atender más rápido.",
    group: "ai",
  },
  customer_analysis: {
    key: "customer_analysis",
    name: "Análisis de clientes IA",
    description: "Segmentación e intención de compra de tus clientes.",
    group: "ai",
  },
  sales_opportunities: {
    key: "sales_opportunities",
    name: "Recomendaciones comerciales IA",
    description: "La IA detecta oportunidades de venta y te las señala.",
    group: "ai",
  },
}

/** Límites de cada plan. Preparados para fases futuras (no se aplican en 2B). */
export const PLAN_LIMITS: Record<PlanSlug, PlanLimits> = {
  business: {
    products: 200,
    allowedUsers: 2,
    posTerminals: 1,
    chatChannels: 0,
    activeConversationsPerMonth: 0,
    aiSuggestedMessagesPerMonth: 0,
    aiRequestsPerMonth: 100,
    activeTickets: 20,
  },
  business_plus: {
    products: null,
    allowedUsers: 5,
    posTerminals: 3,
    chatChannels: 3,
    activeConversationsPerMonth: 500,
    aiSuggestedMessagesPerMonth: 300,
    aiRequestsPerMonth: 500,
    activeTickets: null,
  },
}

/** Catálogo de planes (Panitas Negocios y Panitas Negocios Plus). */
export const PLANS: Record<PlanSlug, PlanDefinition> = {
  business: {
    slug: "business",
    name: "business",
    displayName: "Panitas Negocios",
    tagline: "Todo lo que un emprendedor necesita para operar.",
    description:
      "Gestión de inventario, punto de venta, CRM, tienda online, reportes y asistente IA. Para negocios en crecimiento que quieren vender por todos lados.",
    active: true,
    features: BASE_FEATURES,
    limits: PLAN_LIMITS.business,
  },
  business_plus: {
    slug: "business_plus",
    name: "business_plus",
    displayName: "Panitas Negocios Plus",
    tagline: "IA comercial y atención en todos los canales.",
    description:
      "Todo lo de Panitas Negocios, más el centro de chats (WhatsApp, Instagram, Facebook), sugerencias de respuesta IA, análisis de clientes y recomendaciones comerciales.",
    active: true,
    features: [...BASE_FEATURES, ...PLUS_FEATURES],
    limits: PLAN_LIMITS.business_plus,
  },
}

/** Features por plan. */
export const PLAN_FEATURES: Record<PlanSlug, FeatureKey[]> = {
  business: BASE_FEATURES,
  business_plus: [...BASE_FEATURES, ...PLUS_FEATURES],
}

/** Alias de features para compatibilidad con la API de FASE 2A. */
export const FEATURE_ALIASES: Record<string, FeatureKey> = {
  store: "online_store",
  conversations: "unified_chat",
  ai_sales: "sales_opportunities",
}

/** Grupo de cada feature. */
export function featureGroup(key: FeatureKey): FeatureGroup {
  return FEATURES[key]?.group ?? "core"
}
