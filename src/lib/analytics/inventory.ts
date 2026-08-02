import { InventoryRepository } from "@/repositories/inventory.repository"

export type InventoryHealthOptions = {
  lowStockThreshold?: number
  inactiveDays?: number
  repo?: InventoryRepository
}

export type InventoryHealth = {
  overview: Awaited<ReturnType<InventoryRepository["overview"]>>
  lowStock: Awaited<ReturnType<InventoryRepository["lowStock"]>>
  noMovement: Awaited<ReturnType<InventoryRepository["noMovement"]>>
}

/** Salud del inventario: bajo stock, sin movimiento y resumen de flujo (solo lectura). */
export async function getInventoryHealth(storeId: string, options: InventoryHealthOptions = {}): Promise<InventoryHealth> {
  const repo = options.repo ?? new InventoryRepository()
  const lowStockThreshold = options.lowStockThreshold ?? 5
  const inactiveDays = options.inactiveDays ?? 30

  const [overview, lowStock, noMovement] = await Promise.all([
    repo.overview(storeId, lowStockThreshold, inactiveDays),
    repo.lowStock(storeId, lowStockThreshold),
    repo.noMovement(storeId, inactiveDays),
  ])

  return { overview, lowStock, noMovement }
}
