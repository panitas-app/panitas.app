import { ListChecks } from "lucide-react"
import { formatPrice } from "@/lib/utils"
import type { BusinessMetric, BusinessSummary } from "@/lib/business-intelligence"
import { BusinessHealthCard } from "./business-health-card"
import { InsightList } from "./insight-list"
import { cn } from "@/lib/utils"

function formatMetricValue(metric: BusinessMetric, currency: string): string {
  if (metric.format === "currency") return formatPrice(metric.value, currency)
  if (metric.format === "percent") return `${Math.round(metric.value)}%`
  return metric.value.toLocaleString("es-VE")
}

export function BusinessSummaryView({
  summary,
  currency = "Bs",
  className,
}: {
  summary: BusinessSummary
  currency?: string
  className?: string
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <BusinessHealthCard overview={summary.overview} greeting={summary.greeting} />

      <p className="text-sm text-muted-foreground">{summary.summary}</p>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {summary.metrics.map((metric) => (
          <div key={metric.key} className="rounded-2xl border border-border/60 bg-card/70 p-3">
            <p className="truncate text-xs text-muted-foreground">{metric.label}</p>
            <p className="mt-1 font-heading text-lg font-bold tracking-tight text-foreground">
              {formatMetricValue(metric, currency)}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Puntos para revisar</h3>
        <InsightList insights={summary.insights} />
      </div>

      {summary.recommendations.length > 0 ? (
        <div className="space-y-2 rounded-2xl border border-border/60 bg-card/70 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ListChecks className="size-4" />
            Recomendaciones de revisión
          </h3>
          <ol className="list-inside list-decimal space-y-1.5 text-sm text-muted-foreground">
            {summary.recommendations.map((recommendation, index) => (
              <li key={index}>{recommendation}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  )
}
