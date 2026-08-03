import type { LucideIcon } from "lucide-react"
import { Boxes, ClipboardList, Info, ShoppingCart, Tag, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Recommendation, RecommendationCategory, RecommendationPriority } from "@/lib/recommendations"

const CATEGORY_ICONS: Record<RecommendationCategory, LucideIcon> = {
  INVENTORY: Boxes,
  SALES: ShoppingCart,
  CUSTOMERS: Users,
  OPERATIONS: ClipboardList,
  PRICING: Tag,
}

const CATEGORY_LABEL: Record<RecommendationCategory, string> = {
  INVENTORY: "Inventario",
  SALES: "Ventas",
  CUSTOMERS: "Clientes",
  OPERATIONS: "Operaciones",
  PRICING: "Precios",
}

const PRIORITY_LABEL: Record<RecommendationPriority, string> = {
  HIGH: "Prioridad alta",
  MEDIUM: "Prioridad media",
  LOW: "Prioridad baja",
}

export function RecommendationDetail({
  recommendation,
  onMark,
  busy,
  className,
}: {
  recommendation: Recommendation
  onMark?: (id: string, action: "view" | "dismiss") => void
  busy?: boolean
  className?: string
}) {
  const CategoryIcon = CATEGORY_ICONS[recommendation.category] ?? Info

  return (
    <div className={cn("space-y-3 rounded-2xl border border-border/60 bg-card/70 p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CategoryIcon className="size-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {CATEGORY_LABEL[recommendation.category]}
            </p>
            <h3 className="font-heading text-base font-bold leading-snug text-foreground">
              {recommendation.title}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{PRIORITY_LABEL[recommendation.priority]}</p>
          </div>
        </div>
        <Badge variant="outline" className="shrink-0">
          {PRIORITY_LABEL[recommendation.priority].toUpperCase()}
        </Badge>
      </div>

      <p className="text-sm leading-relaxed text-foreground/90">{recommendation.description}</p>

      {recommendation.reason ? (
        <p className="rounded-xl bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
          {recommendation.reason}
        </p>
      ) : null}

      <p className="text-sm font-medium text-foreground/80">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Acción sugerida: </span>
        {recommendation.suggestedAction}
      </p>

      {onMark ? (
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => onMark(recommendation.id, "view")}
            disabled={busy}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            Lo revisaré
          </button>
          <button
            type="button"
            onClick={() => onMark(recommendation.id, "dismiss")}
            disabled={busy}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            Descartar
          </button>
        </div>
      ) : null}
    </div>
  )
}
