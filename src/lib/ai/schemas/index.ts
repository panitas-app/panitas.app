export const BUSINESS_ONBOARDING_SCHEMA = {
  shortDescription: "string (máximo 120 caracteres)",
  longDescription: "string (máximo 500 caracteres)",
  slogan: "string (máximo 60 caracteres)",
  categories: "string[] (4-8 categorías de productos/servicios)",
  suggestedServices: "string[] (3-6 servicios recomendados según el tipo de negocio)",
  tags: "string[] (5-10 etiquetas SEO)",
  suggestedSchedule: "array de { day: string (Lunes-Domingo), open: string (HH:MM), close: string (HH:MM) }",
  recommendedColors: "{ primary: string (hex), secondary: string (hex) }",
  recommendations: "string[] (3-5 recomendaciones para empezar)",
}

export const PRODUCT_COMPLETION_SCHEMA = {
  description: "string (descripción profesional, máximo 300 caracteres)",
  shortDescription: "string (máximo 100 caracteres)",
  benefits: "string[] (3-5 beneficios)",
  features: "string[] (3-5 características técnicas)",
  seoKeywords: "string[] (5-8 keywords)",
  metaDescription: "string (máximo 160 caracteres)",
  suggestedCategory: "string",
  tags: "string[] (3-5 etiquetas)",
  commercialRecommendations: "string[] (2-3 recomendaciones)",
  sellingTips: "string[] (2-3 consejos de venta)",
  callToAction: "string (frase corta de llamado a la acción)",
}

export const BUSINESS_IMPROVEMENT_SCHEMA = {
  improvedDescription: "string (descripción mejorada, máximo 500 caracteres)",
  slogan: "string (máximo 60 caracteres)",
  suggestedCategories: "string[] (3-6 categorías)",
  suggestedSchedule: "array de { day: string, open: string, close: string }",
  recommendedColors: "{ primary: string, secondary: string }",
  profileTips: "string[] (3-5 consejos para mejorar el perfil)",
}

export const SOCIAL_POST_SCHEMA = {
  instagram: { text: "string", hashtags: "string[]", callToAction: "string", emojis: "string[]" },
  facebook: { text: "string", hashtags: "string[]", callToAction: "string", emojis: "string[]" },
  whatsapp: { message: "string", callToAction: "string", emojis: "string[]" },
  tiktok: { script: "string", hashtags: "string[]", trendingSound: "string o null" },
}

export const ANALYTICS_INSIGHTS_SCHEMA = {
  summary: "string (resumen general de 2-3 oraciones)",
  highlights: "string[] (3-5 hallazgos importantes)",
  trends: "array de { metric: string, change: string, direction: 'up'|'down'|'stable', insight: string }",
  recommendations: "string[] (3-5 recomendaciones accionables)",
  opportunities: "string[] (2-3 oportunidades detectadas)",
  alertas: "array de { type: 'positive'|'negative'|'info', message: string }",
}

export const CHAT_RESPONSE_SCHEMA = {
  answer: "string (respuesta amigable y directa)",
  suggestions: "string[] (3 preguntas sugeridas para seguir)",
  actions: "array de { label: string, type: 'link'|'button', url?: string } opcional",
}

export const SEOSCHEMA = {
  metaTitle: "string (máximo 60 caracteres)",
  metaDescription: "string (máximo 160 caracteres)",
  keywords: "string[] (5-10 keywords)",
  suggestedSlug: "string",
  optimizedDescription: "string (máximo 300 caracteres)",
}

export const MARKETING_SCHEMA = {
  campaignName: "string",
  campaignDescription: "string",
  discountIdeas: "string[] (2-3 ideas de descuento)",
  promotionalText: "string",
  targetAudience: "string",
  channels: "string[] (canales recomendados)",
  callToAction: "string",
  recoveryMessage: "string (mensaje para carritos abandonados)",
  inactiveClientMessage: "string (mensaje para clientes inactivos)",
}
