/**
 * Order Analyzer (FASE 4B).
 *
 * Detecta la carga operativa de pedidos:
 *   - pedidos pendientes de atender,
 *   - pedidos pendientes/confirmados que llevan más de X días sin completarse.
 *
 * Usa la capa de servicios (OrderService); el `storeId` proviene del contexto.
 */
import { OrderService } from "@/services/order.service"
import type { StoreServiceContext } from "@/services/context"
import { RULES } from "../rules"
import type { AnalyzerResult, Observation, OrderData } from "../types"

export interface OrderAnalyzerDeps {
  orderService?: OrderService
  /** Días a partir de los cuales un pedido se considera con posible demora. */
  delayDays?: number
}

const DELAY_DAYS_DEFAULT = 3

export class OrderAnalyzer {
  private readonly service: OrderService
  private readonly delayDays: number

  constructor(deps: OrderAnalyzerDeps = {}) {
    this.service = deps.orderService ?? new OrderService()
    this.delayDays = deps.delayDays ?? DELAY_DAYS_DEFAULT
  }

  async run(ctx: StoreServiceContext): Promise<AnalyzerResult<OrderData>> {
    const [pending, confirmed] = await Promise.all([
      this.service.getPending(ctx, 50),
      this.service.list(ctx, { status: "confirmed", take: 50 }),
    ])

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - this.delayDays)

    const pendingDelayed = pending.filter((o) => o.createdAt < cutoff)
    const confirmedDelayed = confirmed.orders.filter((o) => o.createdAt < cutoff)
    const delayed = [...pendingDelayed, ...confirmedDelayed]

    const observations: Observation[] = []

    if (pending.length > 0) {
      const withDelay = delayed.filter((o) => o.status === "pending").length
      const description =
        withDelay > 0
          ? `${pending.length} pedidos están pendientes de atender; ${withDelay} de ellos llevan más de ${this.delayDays} días.`
          : `${pending.length} pedidos están pendientes de atender.`
      observations.push({
        ruleId: RULES["orders.pending"].id,
        category: "orders",
        importance: "important",
        title: pending.length === 1 ? "1 pedido pendiente de atender" : `${pending.length} pedidos pendientes de atender`,
        description,
        dataSource: RULES["orders.pending"].dataSource,
        action: RULES["orders.pending"].action,
        metricValue: pending.length,
      })
    }

    if (delayed.length > 0) {
      observations.push({
        ruleId: RULES["orders.delayed"].id,
        category: "orders",
        importance: "warning",
        title: delayed.length === 1 ? "1 pedido con posible demora" : `${delayed.length} pedidos con posible demora`,
        description: `${delayed.length} pedido${delayed.length === 1 ? "" : "s"} lleva${delayed.length === 1 ? "" : "n"} más de ${this.delayDays} días sin completarse.`,
        dataSource: RULES["orders.delayed"].dataSource,
        action: RULES["orders.delayed"].action,
        metricValue: delayed.length,
      })
    }

    return {
      observations,
      data: {
        pendingCount: pending.length,
        delayedCount: delayed.length,
      },
    }
  }
}
