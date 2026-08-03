/**
 * Catálogo declarativo de reglas del Business Monitor (FASE 4B).
 *
 * Cada regla describe qué situación detecta, en qué categoría entra, qué
 * importancia tiene por defecto y qué acción de revisión sugiere. Los
 * analizadores producen observaciones referenciando estas reglas; el Insight
 * Engine normaliza la importancia y genera los insights finales.
 *
 * Este catálogo NO inventa predicciones ni toma decisiones por el usuario:
 * solo define situaciones detectables con datos existentes del negocio.
 */
import type { InsightCategory, InsightImportance } from "../types"

export interface RuleDef {
  id: string
  category: InsightCategory
  importance: InsightImportance
  /** Fuente de datos de la que se alimenta la regla (servicio/analytics). */
  dataSource: string
  /** Acción de revisión sugerida (nunca una decisión automática). */
  action: string
}

export const RULES: Record<string, RuleDef> = {
  "inventory.low_stock": {
    id: "inventory.low_stock",
    category: "inventory",
    importance: "important",
    dataSource: "inventory.overview",
    action: "Revisa los productos con inventario bajo y decide si conviene reponer existencias.",
  },
  "inventory.out_of_stock": {
    id: "inventory.out_of_stock",
    category: "inventory",
    importance: "important",
    dataSource: "inventory.lowStock",
    action: "Evalúa reponer los productos agotados para no perder ventas.",
  },
  "inventory.no_movement": {
    id: "inventory.no_movement",
    category: "inventory",
    importance: "info",
    dataSource: "inventory.noMovement",
    action: "Revisa estos productos y valora si requieren promoción o reposición.",
  },
  "inventory.high_rotation": {
    id: "inventory.high_rotation",
    category: "inventory",
    importance: "info",
    dataSource: "inventory.bestSellers",
    action: "Verifica que el stock de los productos más vendidos sea suficiente para la demanda actual.",
  },
  "sales.no_sales_today": {
    id: "sales.no_sales_today",
    category: "sales",
    importance: "info",
    dataSource: "sales.today",
    action: "Revisa si el negocio está operativo y con productos disponibles.",
  },
  "sales.week_comparison": {
    id: "sales.week_comparison",
    category: "sales",
    importance: "info",
    dataSource: "sales.week",
    action: "Revisa los factores que pudieron afectar el desempeño de la semana.",
  },
  "sales.month_comparison": {
    id: "sales.month_comparison",
    category: "sales",
    importance: "info",
    dataSource: "sales.month",
    action: "Compara el avance del mes con el período anterior.",
  },
  "sales.top_products": {
    id: "sales.top_products",
    category: "sales",
    importance: "info",
    dataSource: "sales.productsSold",
    action: "Mantén disponible el inventario de los productos más vendidos.",
  },
  "orders.pending": {
    id: "orders.pending",
    category: "orders",
    importance: "important",
    dataSource: "orders.pending",
    action: "Atiende los pedidos pendientes para evitar demoras o cancelaciones.",
  },
  "orders.delayed": {
    id: "orders.delayed",
    category: "orders",
    importance: "warning",
    dataSource: "orders.list",
    action: "Revisa estos pedidos y confirma su estado o fecha de entrega.",
  },
  "customers.active": {
    id: "customers.active",
    category: "customers",
    importance: "info",
    dataSource: "sales.frequentCustomers",
    action: "",
  },
  "customers.new": {
    id: "customers.new",
    category: "customers",
    importance: "info",
    dataSource: "customers.metrics",
    action: "",
  },
  "customers.outstanding": {
    id: "customers.outstanding",
    category: "customers",
    importance: "warning",
    dataSource: "orders.creditOutstanding",
    action: "Revisa los clientes con saldo pendiente y da seguimiento a sus pagos.",
  },
  "customers.inactive": {
    id: "customers.inactive",
    category: "customers",
    importance: "info",
    dataSource: "customers.metrics",
    action: "Revisa los clientes inactivos y valora un contacto de seguimiento.",
  },
  "activity.overview": {
    id: "activity.overview",
    category: "activity",
    importance: "info",
    dataSource: "monitor.snapshot",
    action: "",
  },
}

export function rule(id: string): RuleDef | undefined {
  return RULES[id]
}
