import type { BusinessSummary, Insight } from "@/lib/business-intelligence"
import type { AssistantRecommendation } from "@/lib/assistant-behavior"

/** Insight 4B con la forma real del Business Summary (nunca inventado). */
export function insight(overrides: Partial<Insight> = {}): Insight {
  return {
    id: "insight:inventory.low_stock",
    category: "inventory",
    importance: "important",
    title: "3 productos requieren reposición",
    description: "Café, Pan y Jugo están por debajo del umbral de stock.",
    dataSource: "inventory.overview",
    createdAt: "2026-08-04T10:00:00.000Z",
    action: "Revisa los productos con inventario bajo y decide si conviene reponer existencias.",
    metricValue: 3,
    ...overrides,
  }
}

/** BusinessSummary con la forma real de la API (FASE 4B). */
export function summary(insights: Insight[] = [], overrides: Partial<BusinessSummary> = {}): BusinessSummary {
  return {
    storeId: "store_1",
    generatedAt: "2026-08-04T10:00:00.000Z",
    greeting: "Buenos días",
    summary: "Revisé el estado de tu negocio.",
    overview: { status: "estable", summary: "El negocio se encuentra en un estado estable.", counts: { important: 0, warning: 0, info: 0 } },
    insights,
    metrics: [],
    recommendations: [],
    ...overrides,
  }
}

/** Caso real: stock bajo + pedidos pendientes + créditos (todas accionables). */
export function actionableSummary(): BusinessSummary {
  return summary([
    insight({ id: "insight:inventory.low_stock" }),
    insight({
      id: "insight:orders.pending",
      category: "orders",
      importance: "important",
      title: "5 pedidos pendientes de atender",
      description: "Hay pedidos sin completar desde hace más de un día.",
      dataSource: "orders.pending",
      action: "Atiende los pedidos pendientes para evitar demoras o cancelaciones.",
      metricValue: 5,
    }),
    insight({
      id: "insight:customers.outstanding",
      category: "customers",
      importance: "warning",
      title: "2 clientes con saldo pendiente",
      description: "María y Luis tienen cuotas por cobrar.",
      dataSource: "orders.creditOutstanding",
      action: "Revisa los clientes con saldo pendiente y da seguimiento a sus pagos.",
      metricValue: 2,
    }),
    insight({
      id: "insight:customers.active",
      category: "customers",
      importance: "info",
      title: "8 clientes activos este mes",
      description: "Resumen informativo de actividad.",
      dataSource: "sales.frequentCustomers",
      action: "",
    }),
  ])
}

/** Recomendación 5F con la forma real. */
export function recommendation(overrides: Partial<AssistantRecommendation> = {}): AssistantRecommendation {
  return {
    id: "reco:inventory.low_stock",
    ruleId: "inventory.low_stock",
    insightId: "insight:inventory.low_stock",
    category: "inventario",
    priority: "alta",
    title: "3 productos requieren reposición",
    description: "Café, Pan y Jugo están por debajo del umbral de stock.",
    quickAction: { label: "Revisar inventario", action: "revisar inventario", variant: "outline", icon: "package" },
    ...overrides,
  }
}
