/**
 * Business Summary Generator (FASE 4B).
 *
 * Compone el resumen final del negocio a partir del reporte del monitor:
 *   - saludo según la hora del día,
 *   - párrafo resumen en lenguaje natural ("¿cómo está mi negocio?"),
 *   - vista general de salud (estable / atención / revisión),
 *   - insights priorizados,
 *   - métricas planas,
 *   - recomendaciones de revisión (acciones sugeridas, sin decisiones).
 *
 * Este objeto es el shape de la Business Summary API: listo para dashboard,
 * chat y móvil.
 */
import { BusinessHealthMonitor } from "../monitors/business-health-monitor"
import { InsightEngine } from "../insights/insight-engine"
import { money } from "../format"
import type {
  BusinessMonitorInput,
  BusinessSummary,
  HealthOverview,
  HealthStatus,
  Insight,
  ActivitySnapshot,
} from "../types"

export interface BusinessSummaryGeneratorDeps {
  monitor?: BusinessHealthMonitor
  insightEngine?: InsightEngine
  currency?: string
  /** Inyectable para pruebas deterministas (hora del saludo). */
  now?: Date
}

export class BusinessSummaryGenerator {
  private readonly monitor: BusinessHealthMonitor
  private readonly insightEngine: InsightEngine
  private readonly currency: string
  private readonly now: () => Date

  constructor(deps: BusinessSummaryGeneratorDeps = {}) {
    this.monitor = deps.monitor ?? new BusinessHealthMonitor()
    this.insightEngine = deps.insightEngine ?? new InsightEngine()
    this.currency = deps.currency ?? "Bs"
    this.now = () => deps.now ?? new Date()
  }

  async generate(input: BusinessMonitorInput): Promise<BusinessSummary> {
    const report = await this.monitor.monitor(input)
    const insights = this.insightEngine.build(report.observations)

    const counts = {
      important: insights.filter((i) => i.importance === "important").length,
      warning: insights.filter((i) => i.importance === "warning").length,
      info: insights.filter((i) => i.importance === "info").length,
    }

    const greeting = this.buildGreeting(input.userName)
    const overview = this.buildOverview(counts)
    const summary = this.buildSummary(report.snapshot, counts, greeting)

    return {
      storeId: input.ctx.storeId,
      generatedAt: report.generatedAt,
      greeting,
      summary,
      overview,
      insights,
      metrics: report.metrics,
      recommendations: this.buildRecommendations(insights),
    }
  }

  private buildGreeting(userName?: string): string {
    const hour = this.now().getHours()
    const part = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches"
    return userName ? `${part} ${userName}` : part
  }

  private buildOverview(counts: { important: number; warning: number; info: number }): HealthOverview {
    let status: HealthStatus = "estable"
    let text = "El negocio se encuentra en un estado estable."
    if (counts.important > 0) {
      status = "revision"
      text = `${counts.important} punto${counts.important === 1 ? "" : "s"} importante${counts.important === 1 ? "" : "s"} requiere${counts.important === 1 ? "" : "n"} tu atención.`
    } else if (counts.warning > 0) {
      status = "atencion"
      text = `${counts.warning} punto${counts.warning === 1 ? "" : "s"} merece${counts.warning === 1 ? "" : "n"} seguimiento.`
    }
    return { status, summary: text, counts }
  }

  private buildSummary(snapshot: ActivitySnapshot, counts: { important: number; warning: number }, greeting: string): string {
    const parts: string[] = [`${greeting}. Revisé el estado de tu negocio.`]

    if (counts.important > 0) {
      parts.push(`Encontré ${counts.important} punto${counts.important === 1 ? "" : "s"} importante${counts.important === 1 ? "" : "s"} para revisar.`)
    } else if (counts.warning > 0) {
      parts.push(`Hay ${counts.warning} punto${counts.warning === 1 ? "" : "s"} para tener en cuenta.`)
    } else {
      parts.push("Todo se ve estable en ventas, inventario y pedidos.")
    }

    parts.push(`Hoy se registraron ${snapshot.salesTodayOrders} venta${snapshot.salesTodayOrders === 1 ? "" : "s"} por un total de ${money(snapshot.salesTodayRevenue, this.currency)}.`)
    return parts.join(" ")
  }

  private buildRecommendations(insights: Insight[]): string[] {
    return [...new Set(insights.filter((i) => i.action).map((i) => i.action!))]
  }
}
