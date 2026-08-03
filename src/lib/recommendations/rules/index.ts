/**
 * Catálogo declarativo de reglas de recomendaciones (FASE 4D).
 *
 * Cada regla describe qué situación se recomienda revisar, su categoría,
 * prioridad, acción de revisión sugerida (nunca una decisión automática),
 * el período de cooldown anti-spam y la razón basada en datos.
 *
 * Reglas de seguridad del producto:
 *   - NUNCA predecir, prometer crecimiento ni recomendar marketing automático.
 *   - NUNCA sugerir subir/bajar precios: solo "revisar" si conviene.
 *   - NUNCA decir "debes hacer esto": siempre "podría ser conveniente revisar".
 */
import type { RecommendationCategory, RecommendationPriority, RecommendationRuleDef } from "../types"

export const RECOMMENDATION_RULES: Record<string, RecommendationRuleDef> = {
  // ── INVENTORY ───────────────────────────────────────────────────────────────
  "inventory.low_stock": {
    id: "inventory.low_stock",
    category: "INVENTORY",
    priority: "HIGH",
    dataSource: "monitor.inventory.low_stock",
    suggestedAction: "Revisa los productos con inventario bajo y decide si conviene reponer existencias.",
    cooldownDays: 7,
    reason: "Basado en tus datos de inventario, hay productos con stock por debajo del umbral.",
  },
  "inventory.out_of_stock": {
    id: "inventory.out_of_stock",
    category: "INVENTORY",
    priority: "HIGH",
    dataSource: "monitor.inventory.out_of_stock",
    suggestedAction: "Evalúa reponer los productos agotados para no perder ventas.",
    cooldownDays: 3,
    reason: "Basado en tus datos de inventario, hay productos sin existencias disponibles.",
  },
  "inventory.no_movement": {
    id: "inventory.no_movement",
    category: "INVENTORY",
    priority: "LOW",
    dataSource: "monitor.inventory.no_movement",
    suggestedAction: "Revisa estos productos y valora si requieren promoción o reposición.",
    cooldownDays: 15,
    reason: "Basado en tus datos, algunos productos no registran movimiento reciente.",
  },
  "inventory.high_rotation": {
    id: "inventory.high_rotation",
    category: "INVENTORY",
    priority: "MEDIUM",
    dataSource: "monitor.inventory.high_rotation",
    suggestedAction: "Verifica que el stock de los productos más vendidos sea suficiente para la demanda actual.",
    cooldownDays: 7,
    reason: "Basado en tus datos de ventas, algunos productos tienen alta rotación.",
  },

  // ── SALES ───────────────────────────────────────────────────────────────────
  "sales.week_comparison": {
    id: "sales.week_comparison",
    category: "SALES",
    priority: "MEDIUM",
    dataSource: "monitor.sales.week_comparison",
    suggestedAction: "Revisa los factores que pudieron afectar el desempeño de la semana.",
    cooldownDays: 7,
    reason: "Basado en la comparación de tus ventas con la semana anterior.",
  },
  "sales.month_comparison": {
    id: "sales.month_comparison",
    category: "SALES",
    priority: "MEDIUM",
    dataSource: "monitor.sales.month_comparison",
    suggestedAction: "Compara el avance del mes con el período anterior.",
    cooldownDays: 7,
    reason: "Basado en la comparación de tus ventas con el mes anterior.",
  },
  "sales.top_products": {
    id: "sales.top_products",
    category: "SALES",
    priority: "MEDIUM",
    dataSource: "monitor.sales.top_products",
    suggestedAction: "Mantén disponible el inventario de los productos más vendidos.",
    cooldownDays: 7,
    reason: "Basado en tus productos más vendidos del mes.",
  },

  // ── CUSTOMERS ───────────────────────────────────────────────────────────────
  "customers.outstanding": {
    id: "customers.outstanding",
    category: "CUSTOMERS",
    priority: "MEDIUM",
    dataSource: "monitor.customers.outstanding",
    suggestedAction: "Revisa los clientes con saldo pendiente y da seguimiento a sus pagos.",
    cooldownDays: 7,
    reason: "Basado en tus datos de créditos y cuotas pendientes de cobro.",
  },
  "customers.inactive": {
    id: "customers.inactive",
    category: "CUSTOMERS",
    priority: "LOW",
    dataSource: "monitor.customers.inactive",
    suggestedAction: "Revisa los clientes inactivos y valora un contacto de seguimiento.",
    cooldownDays: 30,
    reason: "Basado en tus datos de clientes que no han comprado recientemente.",
  },

  // ── OPERATIONS ──────────────────────────────────────────────────────────────
  "orders.pending": {
    id: "orders.pending",
    category: "OPERATIONS",
    priority: "HIGH",
    dataSource: "monitor.orders.pending",
    suggestedAction: "Atiende los pedidos pendientes para evitar demoras o cancelaciones.",
    cooldownDays: 1,
    reason: "Basado en tus pedidos pendientes de atender.",
  },
  "orders.delayed": {
    id: "orders.delayed",
    category: "OPERATIONS",
    priority: "MEDIUM",
    dataSource: "monitor.orders.delayed",
    suggestedAction: "Revisa estos pedidos y confirma su estado o fecha de entrega.",
    cooldownDays: 3,
    reason: "Basado en tus pedidos que llevan tiempo sin completarse.",
  },

  // ── PRICING (solo revisión, nunca subir/bajar) ──────────────────────────────
  "pricing.review_rotation": {
    id: "pricing.review_rotation",
    category: "PRICING",
    priority: "MEDIUM",
    dataSource: "monitor.sales.top_products",
    suggestedAction: "Revisa si los precios de tus productos más vendidos siguen siendo convenientes.",
    cooldownDays: 15,
    reason: "Basado en tus datos de ventas, los productos destacados podrían merecer una revisión de precio.",
  },
}

/** Prioridad por la que se ordena el catálogo dentro del engine. */
export const CATEGORY_PRIORITY: RecommendationCategory[] = [
  "OPERATIONS",
  "INVENTORY",
  "SALES",
  "CUSTOMERS",
  "PRICING",
]

export const PRIORITY_ORDER: RecommendationPriority[] = ["HIGH", "MEDIUM", "LOW"]

export function recommendationRule(id: string): RecommendationRuleDef | undefined {
  return RECOMMENDATION_RULES[id]
}
