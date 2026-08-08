/**
 * Business Knowledge Base (FASE 7D) — Categorías.
 *
 * Categorías del sistema (Ventas, Productos, Servicios, Garantías, Envíos,
 * Cobranza, Proveedores, Políticas, Recursos Humanos, General) + categorías
 * personalizadas que cada negocio crea. Las del sistema se siembran por
 * tienda; las personalizadas son exclusivas del tenant.
 */
import type { KnowledgeCategoryView } from "./knowledge-types"

export interface SystemCategorySeed {
  slug: string
  name: string
  description: string
  color: string
}

/** Categorías del sistema de la Base de Conocimiento. */
export const KNOWLEDGE_SYSTEM_CATEGORIES: readonly SystemCategorySeed[] = [
  { slug: "ventas", name: "Ventas", description: "Procesos, guiones y políticas de venta.", color: "#22c55e" },
  { slug: "productos", name: "Productos", description: "Fichas, catálogos y datos de productos.", color: "#6366f1" },
  { slug: "servicios", name: "Servicios", description: "Servicios ofrecidos y su operación.", color: "#06b6d4" },
  { slug: "garantias", name: "Garantías", description: "Términos y procedimientos de garantía.", color: "#f59e0b" },
  { slug: "envios", name: "Envíos", description: "Tarifas, zonas y políticas de envío.", color: "#0ea5e9" },
  { slug: "cobranza", name: "Cobranza", description: "Políticas y procedimientos de cobro.", color: "#ef4444" },
  { slug: "proveedores", name: "Proveedores", description: "Información de proveedores y compras.", color: "#8b5cf6" },
  { slug: "politicas", name: "Políticas", description: "Políticas generales del negocio.", color: "#f43f5e" },
  { slug: "recursos-humanos", name: "Recursos Humanos", description: "Procedimientos internos del equipo.", color: "#14b8a6" },
  { slug: "general", name: "General", description: "Conocimiento general del negocio.", color: "#64748b" },
]

/** Slugs de categorías del sistema (para no duplicarlas). */
export const KNOWLEDGE_SYSTEM_CATEGORY_SLUGS: readonly string[] = KNOWLEDGE_SYSTEM_CATEGORIES.map((c) => c.slug)

/** Categorías del sistema como vistas (sin storeId/ids de BD). */
export function systemCategoryViews(): KnowledgeCategoryView[] {
  return KNOWLEDGE_SYSTEM_CATEGORIES.map((c) => ({
    id: `system:${c.slug}`,
    storeId: "",
    name: c.name,
    slug: c.slug,
    description: c.description,
    color: c.color,
    isSystem: true,
  }))
}

/** Normaliza el nombre de una categoría a slug. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u00e0-\u00fc\u00f1]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}

/** Valida el nombre de una categoría (mín. 2, máx. 40 caracteres). */
export function isValidCategoryName(name: string): boolean {
  const n = name.trim()
  return n.length >= 2 && n.length <= 40
}
