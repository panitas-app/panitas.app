/**
 * Detector de inventario (FASE 8C).
 *
 * Reglas deterministas sobre datos reales:
 *  - `out_of_stock`: stock <= 0 (producto agotado ahora).
 *  - `low_stock`: 0 < stock <= umbral ("está por agotarse", sin predicción).
 *  - `no_movement`: producto activo sin movimientos de stock recientes.
 *
 * Un producto solo puede generar UN item: agotado excluye por agotarse.
 */
import { ATTENTION_CONFIG } from "../config"
import type { Situation } from "../types"

export interface InventoryRow {
  id: string
  name: string
  stock: number
  createdAt: Date
}

export interface InventoryData {
  products: InventoryRow[]
  /** productIds con movimientos de stock recientes (ventana noMovementDays). */
  activeProductIds: string[]
}

export function detectInventory(data: InventoryData, now: Date = new Date()): Situation[] {
  const lowStockThreshold = ATTENTION_CONFIG.lowStockThreshold
  const noMovementCutoff = new Date(now.getTime() - ATTENTION_CONFIG.noMovementDays * 24 * 60 * 60 * 1000)
  const withRecentMovement = new Set(data.activeProductIds)

  const situations: Situation[] = []

  for (const product of data.products) {
    if (product.stock <= 0) {
      situations.push({
        type: "inventory.out_of_stock",
        priority: "high",
        entityType: "product",
        entityId: product.id,
        title: `"${product.name}" agotado`,
        description: `El producto "${product.name}" está agotado y no se puede vender.`,
        recommendation: "Registra una compra o reposición de stock para seguir vendiendo.",
        metadata: { stock: product.stock, productName: product.name },
      })
      continue
    }

    if (product.stock <= lowStockThreshold) {
      situations.push({
        type: "inventory.low_stock",
        priority: "medium",
        entityType: "product",
        entityId: product.id,
        title: `"${product.name}" está por agotarse`,
        description: `Quedan ${product.stock} unidad(es) de "${product.name}".`,
        recommendation: "Considera reponer antes de que se agote.",
        metadata: { stock: product.stock, productName: product.name },
      })
      continue
    }

    if (product.createdAt < noMovementCutoff && !withRecentMovement.has(product.id)) {
      situations.push({
        type: "inventory.no_movement",
        priority: "low",
        entityType: "product",
        entityId: product.id,
        title: `"${product.name}" sin movimiento`,
        description: `"${product.name}" no registra movimientos de stock en los últimos ${ATTENTION_CONFIG.noMovementDays} días.`,
        recommendation: "Revisa si el producto debe promocionarse, ajustarse o retirarse del catálogo.",
        metadata: { productName: product.name },
      })
    }
  }

  return situations
}
