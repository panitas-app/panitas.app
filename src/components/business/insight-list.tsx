import { cn } from "@/lib/utils"
import type { Insight } from "@/lib/business-intelligence"
import { InsightCard } from "./insight-card"

export function InsightList({
  insights,
  limit,
  className,
}: {
  insights: Insight[]
  /** Máximo de hallazgos visibles (los primeros, ya priorizados). */
  limit?: number
  className?: string
}) {
  const visible = limit && limit > 0 ? insights.slice(0, limit) : insights

  if (visible.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin hallazgos relevantes en este momento.</p>
  }

  return (
    <ol className={cn("space-y-2.5", className)}>
      {visible.map((insight) => (
        <li key={insight.id}>
          <InsightCard insight={insight} />
        </li>
      ))}
    </ol>
  )
}
