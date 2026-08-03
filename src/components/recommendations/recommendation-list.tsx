import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Recommendation } from "@/lib/recommendations"
import { RecommendationCard } from "./recommendation-card"

export function RecommendationList({
  recommendations,
  onMark,
  busy,
  emptyText = "No hay recomendaciones pendientes en este momento. Todo se ve estable.",
  className,
}: {
  recommendations: Recommendation[]
  onMark?: (id: string, action: "view" | "dismiss") => void
  busy?: boolean
  emptyText?: string
  className?: string
}) {
  if (recommendations.length === 0) {
    return (
      <div
        className={cn(
          "flex items-start gap-2.5 rounded-2xl border border-dashed border-border/70 bg-card/40 p-3.5 text-xs text-muted-foreground",
          className,
        )}
      >
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary/60" />
        <span>{emptyText}</span>
      </div>
    )
  }

  return (
    <div className={cn("space-y-2.5", className)}>
      {recommendations.map((rec) => (
        <RecommendationCard key={rec.id} recommendation={rec} onMark={onMark} busy={busy} />
      ))}
    </div>
  )
}
