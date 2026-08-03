/**
 * Sales Analyzer (FASE 4B).
 *
 * Analiza el desempeño de ventas con datos existentes:
 *   - ventas de hoy / semana / mes y ticket promedio,
 *   - comparación con la semana y el mes anterior (sin predicciones),
 *   - productos más vendidos del mes.
 *
 * Usa la capa de servicios (SalesService); el `storeId` siempre proviene del
 * contexto autenticado.
 */
import { SalesService } from "@/services/sales.service"
import type { StoreServiceContext } from "@/services/context"
import { RULES } from "../rules"
import { money, pct, startOfDay, startOfMonth, startOfWeek } from "../format"
import type { AnalyzerResult, Observation, SalesData } from "../types"

export interface SalesAnalyzerDeps {
  salesService?: SalesService
  /** Umbral mínimo de cambio (0..1) para reportar la comparación de períodos. */
  comparisonThreshold?: number
  currency?: string
}

const COMPARISON_DEFAULT = 0.1

export class SalesAnalyzer {
  private readonly service: SalesService
  private readonly threshold: number
  private readonly currency: string

  constructor(deps: SalesAnalyzerDeps = {}) {
    this.service = deps.salesService ?? new SalesService()
    this.threshold = deps.comparisonThreshold ?? COMPARISON_DEFAULT
    this.currency = deps.currency ?? "Bs"
  }

  async run(ctx: StoreServiceContext): Promise<AnalyzerResult<SalesData>> {
    const now = new Date()
    const weekStart = startOfWeek(now)
    const monthStart = startOfMonth(now)

    const prevWeekStart = new Date(weekStart)
    prevWeekStart.setDate(prevWeekStart.getDate() - 7)
    const prevMonthStart = new Date(monthStart)
    prevMonthStart.setMonth(prevMonthStart.getMonth() - 1)

    const [today, week, month, prevWeek, prevMonth, products] = await Promise.all([
      this.service.summary(ctx, { from: startOfDay(now).toISOString() }),
      this.service.summary(ctx, { from: weekStart.toISOString() }),
      this.service.summary(ctx, { from: monthStart.toISOString() }),
      this.service.summary(ctx, { from: prevWeekStart.toISOString(), to: weekStart.toISOString() }),
      this.service.summary(ctx, { from: prevMonthStart.toISOString(), to: monthStart.toISOString() }),
      this.service.productsSold(ctx, monthStart.toISOString(), undefined, 3),
    ])

    const averageTicket = month.totalOrders > 0 ? month.revenue / month.totalOrders : 0
    const observations: Observation[] = []

    if (today.totalOrders === 0) {
      observations.push({
        ruleId: RULES["sales.no_sales_today"].id,
        category: "sales",
        importance: "info",
        title: "Aún no hay ventas hoy",
        description: "Todavía no se registran ventas en el día de hoy.",
        dataSource: RULES["sales.no_sales_today"].dataSource,
        action: RULES["sales.no_sales_today"].action,
        metricValue: 0,
      })
    }

    const weekDelta = deltaPercent(week.revenue, prevWeek.revenue)
    if (prevWeek.revenue > 0 && Math.abs(weekDelta) >= this.threshold) {
      observations.push({
        ruleId: RULES["sales.week_comparison"].id,
        category: "sales",
        importance: "info",
        title: weekDelta > 0 ? "Ventas de la semana en aumento" : "Ventas de la semana en descenso",
        description:
          `Las ventas de esta semana (${money(week.revenue, this.currency)}) son un ${pct(Math.abs(weekDelta))} ` +
          `${weekDelta > 0 ? "mayores" : "menores"} que las de la semana anterior (${money(prevWeek.revenue, this.currency)}).`,
        dataSource: RULES["sales.week_comparison"].dataSource,
        action: RULES["sales.week_comparison"].action,
        metricValue: weekDelta,
      })
    }

    const monthDelta = deltaPercent(month.revenue, prevMonth.revenue)
    if (prevMonth.revenue > 0 && Math.abs(monthDelta) >= this.threshold) {
      observations.push({
        ruleId: RULES["sales.month_comparison"].id,
        category: "sales",
        importance: "info",
        title: monthDelta > 0 ? "Ventas del mes en aumento" : "Ventas del mes en descenso",
        description:
          `Las ventas del mes (${money(month.revenue, this.currency)}) van un ${pct(Math.abs(monthDelta))} ` +
          `${monthDelta > 0 ? "por encima" : "por debajo"} del mismo período del mes anterior (${money(prevMonth.revenue, this.currency)}).`,
        dataSource: RULES["sales.month_comparison"].dataSource,
        action: RULES["sales.month_comparison"].action,
        metricValue: monthDelta,
      })
    }

    if (products.length > 0) {
      observations.push({
        ruleId: RULES["sales.top_products"].id,
        category: "sales",
        importance: "info",
        title: "Productos destacados del mes",
        description: `Los más vendidos del mes son: ${products
          .map((p) => `${p.name} (${p.quantity} unid.)`)
          .join(", ")}.`,
        dataSource: RULES["sales.top_products"].dataSource,
        action: RULES["sales.top_products"].action,
        metricValue: products[0]?.quantity ?? 0,
      })
    }

    return {
      observations,
      data: {
        todayOrders: today.totalOrders,
        todayRevenue: today.revenue,
        weekRevenue: week.revenue,
        monthRevenue: month.revenue,
        averageTicket,
      },
    }
  }
}

function deltaPercent(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 1 : 0
  return (current - previous) / previous
}
