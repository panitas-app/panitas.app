import { getCurrentStore } from "@/lib/permissions"
import { getEffectiveRate } from "@/lib/bcv"
import { prisma } from "@/lib/prisma"
import { AnalyticsContent } from "./analytics-content"

export const dynamic = "force-dynamic"

/**
 * Reportes (FASE 4F+): el panel de control (KPIs + gráfico de ventas) se integra
 * arriba de todos los reportes existentes. Las órdenes y la tasa se cargan en el
 * servidor y se pasan al cliente para alimentar el gráfico.
 */
export default async function AnalyticsPage() {
  let current
  try {
    current = await getCurrentStore()
  } catch (e) {
    console.error("[analytics getCurrentStore error]", e)
    throw e
  }
  if (!current) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        No se pudo cargar tu tienda.
      </div>
    )
  }

  const [orders, rate] = await Promise.all([
    prisma.order
      .findMany({
        where: { storeId: current.store.id },
        select: { id: true, total: true, bcvRateAtOrder: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      })
      .catch(() => []),
    getEffectiveRate(),
  ])

  return <AnalyticsContent orders={orders} initialRate={rate} />
}
