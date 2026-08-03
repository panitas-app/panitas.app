/**
 * Activity Analyzer (FASE 4B).
 *
 * Convierte el snapshot del monitor en una observación general de actividad:
 * una síntesis breve de qué está pasando hoy en el negocio (ventas, pedidos
 * pendientes, stock bajo). No añade consultas: trabaja solo con los datos que
 * ya obtuvieron los demás analizadores.
 */
import { RULES } from "../rules"
import { money } from "../format"
import type { ActivitySnapshot, Observation } from "../types"

export interface ActivityAnalyzerDeps {
  currency?: string
}

export class ActivityAnalyzer {
  private readonly currency: string

  constructor(deps: ActivityAnalyzerDeps = {}) {
    this.currency = deps.currency ?? "Bs"
  }

  run(snapshot: ActivitySnapshot): Observation[] {
    const parts: string[] = [
      `Hoy hay ${snapshot.salesTodayOrders} venta${snapshot.salesTodayOrders === 1 ? "" : "s"} registrada${snapshot.salesTodayOrders === 1 ? "" : "s"} por un total de ${money(snapshot.salesTodayRevenue, this.currency)}.`,
    ]
    if (snapshot.pendingOrders > 0) {
      parts.push(`Quedan ${snapshot.pendingOrders} pedido${snapshot.pendingOrders === 1 ? "" : "s"} pendiente${snapshot.pendingOrders === 1 ? "" : "s"} de atender.`)
    }
    if (snapshot.lowStockCount > 0) {
      parts.push(`${snapshot.lowStockCount} producto${snapshot.lowStockCount === 1 ? "" : "s"} tiene${snapshot.lowStockCount === 1 ? "" : "n"} inventario bajo.`)
    }

    return [
      {
        ruleId: RULES["activity.overview"].id,
        category: "activity",
        importance: "info",
        title: "Actividad del negocio",
        description: parts.join(" "),
        dataSource: RULES["activity.overview"].dataSource,
      },
    ]
  }
}
