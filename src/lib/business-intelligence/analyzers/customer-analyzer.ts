/**
 * Customer Analyzer (FASE 4B).
 *
 * Analiza la cartera de clientes SOLO por grupos (nunca por cliente
 * individual):
 *   - clientes activos este mes,
 *   - clientes nuevos este mes,
 *   - clientes con saldo pendiente (créditos/cuotas por cobrar),
 *   - clientes inactivos en la ventana configurada.
 *
 * Regla 4B: no se generan insights individuales del tipo "Pedro no compra hace
 * 50 días"; profundizar en un cliente concreto queda bajo solicitud explícita.
 */
import { CustomerService } from "@/services/customer.service"
import { OrderService } from "@/services/order.service"
import { SalesService } from "@/services/sales.service"
import type { StoreServiceContext } from "@/services/context"
import { RULES } from "../rules"
import { startOfMonth } from "../format"
import type { AnalyzerResult, CustomerData, Observation } from "../types"

export interface CustomerAnalyzerDeps {
  customerService?: CustomerService
  orderService?: OrderService
  salesService?: SalesService
  inactiveDays?: number
}

const INACTIVE_DAYS_DEFAULT = 60

export class CustomerAnalyzer {
  private readonly customerService: CustomerService
  private readonly orderService: OrderService
  private readonly salesService: SalesService
  private readonly inactiveDays: number

  constructor(deps: CustomerAnalyzerDeps = {}) {
    this.customerService = deps.customerService ?? new CustomerService()
    this.orderService = deps.orderService ?? new OrderService()
    this.salesService = deps.salesService ?? new SalesService()
    this.inactiveDays = deps.inactiveDays ?? INACTIVE_DAYS_DEFAULT
  }

  async run(ctx: StoreServiceContext): Promise<AnalyzerResult<CustomerData>> {
    const monthStart = startOfMonth(new Date())
    const [metrics, active, outstanding] = await Promise.all([
      this.customerService.metrics(ctx, this.inactiveDays),
      this.salesService.frequentCustomers(ctx, monthStart.toISOString(), undefined, 100),
      this.orderService.creditOutstanding(ctx),
    ])

    const observations: Observation[] = []
    const activeCount = active.length

    if (activeCount > 0) {
      observations.push({
        ruleId: RULES["customers.active"].id,
        category: "customers",
        importance: "info",
        title: "Clientes activos este mes",
        description: `Tienes ${activeCount} cliente${activeCount === 1 ? "" : "s"} que compraron este mes.`,
        dataSource: RULES["customers.active"].dataSource,
        metricValue: activeCount,
      })
    }

    if (metrics.newThisMonth > 0) {
      observations.push({
        ruleId: RULES["customers.new"].id,
        category: "customers",
        importance: "info",
        title: "Clientes nuevos este mes",
        description: `Se registraron ${metrics.newThisMonth} cliente${metrics.newThisMonth === 1 ? "" : "s"} nuevos este mes.`,
        dataSource: RULES["customers.new"].dataSource,
        metricValue: metrics.newThisMonth,
      })
    }

    if (outstanding > 0) {
      observations.push({
        ruleId: RULES["customers.outstanding"].id,
        category: "customers",
        importance: "warning",
        title: outstanding === 1 ? "1 cliente con saldo pendiente" : `${outstanding} clientes con saldo pendiente`,
        description: `${outstanding} cliente${outstanding === 1 ? "" : "s"} tiene${outstanding === 1 ? "" : "n"} créditos o cuotas pendientes de cobro.`,
        dataSource: RULES["customers.outstanding"].dataSource,
        action: RULES["customers.outstanding"].action,
        metricValue: outstanding,
      })
    }

    if (metrics.inactive > 0) {
      observations.push({
        ruleId: RULES["customers.inactive"].id,
        category: "customers",
        importance: "info",
        title: `${metrics.inactive} clientes inactivos`,
        description: `${metrics.inactive} cliente${metrics.inactive === 1 ? "" : "s"} no ha${metrics.inactive === 1 ? "" : "n"} comprado en los últimos ${this.inactiveDays} días.`,
        dataSource: RULES["customers.inactive"].dataSource,
        action: RULES["customers.inactive"].action,
        metricValue: metrics.inactive,
      })
    }

    return {
      observations,
      data: {
        totalCustomers: metrics.total,
        newThisMonth: metrics.newThisMonth,
        activeThisMonth: activeCount,
        outstandingCustomers: outstanding,
        inactiveCount: metrics.inactive,
      },
    }
  }
}
