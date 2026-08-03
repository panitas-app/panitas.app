import { cn } from "@/lib/utils"
import type { Insight } from "@/lib/business-intelligence"
import { InsightCard } from "./insight-card"

export function InsightList({ insights, className }: { insights: Insight[]; className?: string }) {
  if (insights.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin hallazgos relevantes en este momento.</p>
  }

  return (
    <ol className={cn("space-y-2.5", className)}>
      {insights.map((insight) => (
        <li key={insight.id}>
          <InsightCard insight={insight} />
        </li>
      ))}
    </ol>
  )
}
