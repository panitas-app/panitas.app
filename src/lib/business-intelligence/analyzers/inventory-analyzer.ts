/**
 * Inventory Analyzer (FASE 4B).
 *
 * Detecta situaciones de inventario con datos existentes:
 *   A) productos agotados / con stock bajo (sin predicciones),
 *   B) productos sin movimiento reciente,
 *   C) productos de alta rotación del mes.
 *
 * Usa únicamente la capa de servicios (InventoryService), por lo que respeta
 * el aislamiento de negocio vía `StoreServiceContext`.
 */
import { InventoryService } from "@/services/inventory.service"
import type { StoreServiceContext } from "@/services/context"
import { RULES } from "../rules"
import { startOfMonth } from "../format"
import type { AnalyzerResult, InventoryData, Observation } from "../types"

export interface InventoryAnalyzerDeps {
  inventoryService?: InventoryService
  lowStockThreshold?: number
  inactiveDays?: number
}

const LOW_STOCK_DEFAULT = 5
const INACTIVE_DAYS_DEFAULT = 30

function names(items: Array<{ name?: string | null }>, limit = 3): string {
  return items
    .slice(0, limit)
    .map((item) => item.name ?? "Producto")
    .join(", ")
}

export class InventoryAnalyzer {
  private readonly service: InventoryService
  private readonly threshold: number
  private readonly inactiveDays: number

  constructor(deps: InventoryAnalyzerDeps = {}) {
    this.service = deps.inventoryService ?? new InventoryService()
    this.threshold = deps.lowStockThreshold ?? LOW_STOCK_DEFAULT
    this.inactiveDays = deps.inactiveDays ?? INACTIVE_DAYS_DEFAULT
  }

  async run(ctx: StoreServiceContext): Promise<AnalyzerResult<InventoryData>> {
    const monthStart = startOfMonth(new Date())
    const [overview, lowStock, noMovement, bestSellers] = await Promise.all([
      this.service.overview(ctx, {
        lowStockThreshold: this.threshold,
        windowDays: this.inactiveDays,
      }),
      this.service.lowStock(ctx, this.threshold, 50),
      this.service.noMovement(ctx, this.inactiveDays, 50),
      this.service.bestSellers(ctx, monthStart.toISOString(), undefined, 5),
    ])

    const observations: Observation[] = []

    const outOfStock = lowStock.filter((p) => p.stock === 0)
    if (outOfStock.length > 0) {
      observations.push({
        ruleId: RULES["inventory.out_of_stock"].id,
        category: "inventory",
        importance: "important",
        title: outOfStock.length === 1 ? "1 producto agotado" : `${outOfStock.length} productos agotados`,
        description: `${outOfStock.length === 1 ? "Hay 1 producto" : `Hay ${outOfStock.length} productos`} sin existencias disponibles: ${names(outOfStock)}.`,
        dataSource: RULES["inventory.out_of_stock"].dataSource,
        action: RULES["inventory.out_of_stock"].action,
        metricValue: outOfStock.length,
      })
    }

    const low = lowStock.filter((p) => p.stock > 0)
    if (low.length > 0) {
      observations.push({
        ruleId: RULES["inventory.low_stock"].id,
        category: "inventory",
        importance: "important",
        title: low.length === 1 ? "1 producto con inventario bajo" : `${low.length} productos con inventario bajo`,
        description: `${low.length === 1 ? "Hay 1 producto" : `Hay ${low.length} productos`} con stock por debajo del umbral de ${this.threshold} unidades: ${names(low)}.`,
        dataSource: RULES["inventory.low_stock"].dataSource,
        action: RULES["inventory.low_stock"].action,
        metricValue: low.length,
      })
    }

    if (noMovement.length > 0) {
      observations.push({
        ruleId: RULES["inventory.no_movement"].id,
        category: "inventory",
        importance: "info",
        title: `${noMovement.length} productos sin movimiento`,
        description: `${noMovement.length} producto${noMovement.length === 1 ? "" : "s"} no registra${noMovement.length === 1 ? "" : "n"} ventas ni movimientos en los últimos ${this.inactiveDays} días: ${names(noMovement)}.`,
        dataSource: RULES["inventory.no_movement"].dataSource,
        action: RULES["inventory.no_movement"].action,
        metricValue: noMovement.length,
      })
    }

    if (bestSellers.length > 0) {
      observations.push({
        ruleId: RULES["inventory.high_rotation"].id,
        category: "inventory",
        importance: "info",
        title: "Productos más vendidos del mes",
        description: `Los productos más vendidos este mes son: ${bestSellers
          .slice(0, 3)
          .map((b) => `${b.name} (${b.quantity} unid.)`)
          .join(", ")}.`,
        dataSource: RULES["inventory.high_rotation"].dataSource,
        action: RULES["inventory.high_rotation"].action,
        metricValue: bestSellers[0]?.quantity ?? 0,
      })
    }

    return {
      observations,
      data: {
        lowStockCount: overview.lowStockCount,
        outOfStockCount: outOfStock.length,
        noMovementCount: noMovement.length,
      },
    }
  }
}
