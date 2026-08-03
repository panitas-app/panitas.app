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

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link"

const PRIORITY_META: Record<RecommendationPriority, { label: string; variant: BadgeVariant; accent: string }> = {
  HIGH: {
    label: "ALTA",
    variant: "destructive",
    accent: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  MEDIUM: {
    label: "MEDIA",
    variant: "secondary",
    accent: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  LOW: {
    label: "BAJA",
    variant: "outline",
    accent: "border-primary/20 bg-primary/10 text-primary",
  },
}

const CATEGORY_LABEL: Record<RecommendationCategory, string> = {
  INVENTORY: "Inventario",
  SALES: "Ventas",
  CUSTOMERS: "Clientes",
  OPERATIONS: "Operaciones",
  PRICING: "Precios",
}

export function RecommendationCard({
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
  const meta = PRIORITY_META[recommendation.priority]

  return (
    <div className={cn("flex gap-3 rounded-2xl border border-border/60 bg-card/70 p-3.5", className)}>
      <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", meta.accent)}>
        <CategoryIcon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {CATEGORY_LABEL[recommendation.category]}
            </p>
            <p className="text-sm font-medium text-foreground">{recommendation.title}</p>
          </div>
          <Badge variant={meta.variant} className="shrink-0">
            {meta.label}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{recommendation.description}</p>
        <p className="mt-1.5 text-xs text-foreground/70">{recommendation.suggestedAction}</p>
        {onMark ? (
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={() => onMark(recommendation.id, "view")}
              disabled={busy}
              className="rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              Lo revisaré
            </button>
            <button
              type="button"
              onClick={() => onMark(recommendation.id, "dismiss")}
              disabled={busy}
              className="rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              Descartar
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
