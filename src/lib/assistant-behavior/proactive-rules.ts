/**
 * Catálogo declarativo de reglas proactivas (FASE 5F).
 *
 * Define CÓMO responder ante cada situación que el Business Monitor (4B)
 * detecta: categoría de recomendación, prioridad y acción rápida. Las reglas
 * son solo un mapa de comportamiento: el motor NUNCA actúa por su cuenta, solo
 * sugiere y deja la acción al usuario.
 *
 * Situaciones cubiertas con fuente real en 4B: stock crítico/bajo, pedidos
 * pendientes y retrasados, comparativas de ventas, clientes con saldo
 * pendiente y clientes inactivos. Las reglas se disparan únicamente cuando el
 * monitor produce la observación correspondiente (nunca se inventa el dato).
 *
 * Acciones rápidas canónicas (texto semántico, regla 5D/5E): Ver pedidos,
 * Revisar inventario, Cobrar clientes, Registar pago y Registrar compra.
 */
import type { AssistantPriority, AssistantQuickAction, AssistantRecommendationCategory } from "./types"

export interface ProactiveRuleDef {
  id: string
  category: AssistantRecommendationCategory
  priority: AssistantPriority
  quickAction: AssistantQuickAction
}

/** Acción rápida canónica por categoría (fallback para insights no catalogados). */
export const CATEGORY_DEFAULT_ACTIONS: Record<AssistantRecommendationCategory, AssistantQuickAction> = {
  operacion: { label: "Ver pedidos", action: "ver los pedidos pendientes", variant: "outline", icon: "package-check" },
  inventario: { label: "Revisar inventario", action: "revisar inventario", variant: "outline", icon: "package" },
  finanzas: { label: "Ver ventas", action: "ver el resumen de ventas", variant: "outline", icon: "trending-up" },
  clientes: { label: "Cobrar clientes", action: "cobrar clientes con saldo pendiente", variant: "outline", icon: "banknote" },
  proveedores: { label: "Registrar compra", action: "registrar una compra", variant: "outline", icon: "shopping-cart" },
}

export const PROACTIVE_RULES: Record<string, ProactiveRuleDef> = {
  // ── Stock crítico / inventario ─────────────────────────────────────────────
  "inventory.low_stock": {
    id: "inventory.low_stock",
    category: "inventario",
    priority: "alta",
    quickAction: { label: "Revisar inventario", action: "revisar inventario", variant: "outline", icon: "package" },
  },
  "inventory.out_of_stock": {
    id: "inventory.out_of_stock",
    category: "inventario",
    priority: "alta",
    quickAction: { label: "Revisar inventario", action: "revisar inventario", variant: "outline", icon: "package-x" },
  },
  "inventory.high_rotation": {
    id: "inventory.high_rotation",
    category: "inventario",
    priority: "media",
    quickAction: { label: "Revisar inventario", action: "revisar el inventario de los productos más vendidos", variant: "outline", icon: "package-check" },
  },
  "inventory.no_movement": {
    id: "inventory.no_movement",
    category: "inventario",
    priority: "baja",
    quickAction: { label: "Revisar inventario", action: "revisar los productos sin movimiento reciente", variant: "outline", icon: "package-minus" },
  },

  // ── Pedidos / operación ────────────────────────────────────────────────────
  "orders.pending": {
    id: "orders.pending",
    category: "operacion",
    priority: "alta",
    quickAction: { label: "Ver pedidos", action: "ver los pedidos pendientes", variant: "outline", icon: "package-check" },
  },
  "orders.delayed": {
    id: "orders.delayed",
    category: "operacion",
    priority: "media",
    quickAction: { label: "Ver pedidos", action: "ver los pedidos retrasados", variant: "outline", icon: "clock" },
  },

  // ── Ventas / finanzas ──────────────────────────────────────────────────────
  "sales.no_sales_today": {
    id: "sales.no_sales_today",
    category: "finanzas",
    priority: "media",
    quickAction: { label: "Ver ventas", action: "ver el resumen de ventas de hoy", variant: "outline", icon: "trending-up" },
  },
  "sales.week_comparison": {
    id: "sales.week_comparison",
    category: "finanzas",
    priority: "media",
    quickAction: { label: "Ver ventas", action: "ver el resumen de ventas de la semana", variant: "outline", icon: "trending-up" },
  },
  "sales.month_comparison": {
    id: "sales.month_comparison",
    category: "finanzas",
    priority: "media",
    quickAction: { label: "Ver ventas", action: "ver el resumen de ventas del mes", variant: "outline", icon: "trending-up" },
  },
  "sales.top_products": {
    id: "sales.top_products",
    category: "inventario",
    priority: "media",
    quickAction: { label: "Revisar inventario", action: "revisar el inventario de los productos más vendidos", variant: "outline", icon: "package-check" },
  },

  // ── Créditos y clientes ────────────────────────────────────────────────────
  "customers.outstanding": {
    id: "customers.outstanding",
    category: "clientes",
    priority: "alta",
    quickAction: { label: "Cobrar clientes", action: "cobrar clientes con saldo pendiente", variant: "outline", icon: "banknote" },
  },
  "customers.inactive": {
    id: "customers.inactive",
    category: "clientes",
    priority: "baja",
    quickAction: { label: "Ver clientes", action: "ver clientes inactivos", variant: "outline", icon: "users" },
  },
}

/** Devuelve la regla proactiva para un ruleId, si existe. */
export function proactiveRuleFor(ruleId: string): ProactiveRuleDef | undefined {
  return PROACTIVE_RULES[ruleId]
}
