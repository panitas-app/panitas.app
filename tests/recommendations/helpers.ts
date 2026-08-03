import type { ActivitySnapshot, MonitorReport, Observation } from "@/lib/business-intelligence"

/** Snapshot de actividad con valores neutros (evita falso-positivos). */
export function snapshot(overrides: Partial<ActivitySnapshot> = {}): ActivitySnapshot {
  return {
    salesTodayOrders: 0,
    salesTodayRevenue: 0,
    salesWeekRevenue: 0,
    salesMonthRevenue: 0,
    averageTicketMonth: 0,
    lowStockCount: 0,
    pendingOrders: 0,
    totalCustomers: 0,
    newCustomersThisMonth: 0,
    activeCustomersThisMonth: 0,
    customersWithOutstanding: 0,
    ...overrides,
  }
}

/** Observación 4B con defaults mínimos válidos. */
export function observation(overrides: Partial<Observation> = {}): Observation {
  return {
    ruleId: "inventory.low_stock",
    category: "inventory",
    importance: "important",
    title: "Productos con inventario bajo",
    description: "Hay productos con stock por debajo del umbral.",
    dataSource: "inventory.overview",
    ...overrides,
  }
}

/** Reporte 4B listo para el engine. */
export function report(observations: Observation[]): MonitorReport {
  return {
    generatedAt: "2026-08-03T12:00:00.000Z",
    snapshot: snapshot(),
    observations,
    metrics: [],
  }
}

/** Fila Prisma de recomendación (shape devuelto por el repositorio). */
export function recommendationRow(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> & {
  id: string
  storeId: string
  ruleId: string
  category: string
  priority: string
  status: string
  title: string
  description: string
  reason: string | null
  dataSource: string | null
  suggestedAction: string | null
  entityId: string | null
  metadata: string | null
  createdAt: Date
  viewedAt: Date | null
  dismissedAt: Date | null
} {
  return {
    id: "rec-1",
    storeId: "store-1",
    ruleId: "inventory.low_stock",
    category: "INVENTORY",
    priority: "HIGH",
    status: "active",
    title: "Productos con inventario bajo",
    description: "Hay productos con stock por debajo del umbral.",
    reason: "Basado en tus datos de inventario.",
    dataSource: "monitor.inventory.low_stock",
    suggestedAction: "Revisa los productos con inventario bajo.",
    entityId: null,
    metadata: "{}",
    createdAt: new Date("2026-08-03T12:00:00.000Z"),
    viewedAt: null,
    dismissedAt: null,
    ...overrides,
  }
}
