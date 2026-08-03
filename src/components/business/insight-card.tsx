import type { LucideIcon } from "lucide-react"
import { Activity, AlertTriangle, ArrowRight, Boxes, Info, ShoppingCart, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Insight, InsightCategory, InsightImportance } from "@/lib/business-intelligence"

const CATEGORY_ICONS: Record<InsightCategory, LucideIcon> = {
  inventory: Boxes,
  sales: ShoppingCart,
  orders: AlertTriangle,
  customers: Users,
  activity: Activity,
  general: Info,
}

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link"

const IMPORTANCE_META: Record<InsightImportance, { label: string; variant: BadgeVariant; accent: string }> = {
  important: {
    label: "IMPORTANTE",
    variant: "destructive",
    accent: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  warning: {
    label: "WARNING",
    variant: "secondary",
    accent: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  info: {
    label: "INFO",
    variant: "outline",
    accent: "border-primary/20 bg-primary/10 text-primary",
  },
}

export function InsightCard({ insight, className }: { insight: Insight; className?: string }) {
  const CategoryIcon = CATEGORY_ICONS[insight.category] ?? Info
  const meta = IMPORTANCE_META[insight.importance]

  return (
    <div className={cn("flex gap-3 rounded-2xl border border-border/60 bg-card/70 p-3.5", className)}>
      <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", meta.accent)}>
        <CategoryIcon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{insight.title}</p>
          <Badge variant={meta.variant} className="shrink-0">
            {meta.label}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{insight.description}</p>
        {insight.action ? (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-foreground/80">
            <ArrowRight className="mt-0.5 size-3 shrink-0" />
            <span>{insight.action}</span>
          </p>
        ) : null}
      </div>
    </div>
  )
}
