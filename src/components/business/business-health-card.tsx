import type { LucideIcon } from "lucide-react"
import { CheckCircle2, Eye, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { HealthOverview, HealthStatus } from "@/lib/business-intelligence"

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link"

const STATUS_META: Record<HealthStatus, { label: string; variant: BadgeVariant; icon: LucideIcon; tone: string }> = {
  estable: { label: "Estable", variant: "default", icon: CheckCircle2, tone: "text-emerald-600 dark:text-emerald-400" },
  atencion: { label: "Atención", variant: "secondary", icon: Eye, tone: "text-amber-600 dark:text-amber-400" },
  revision: { label: "Revisión", variant: "destructive", icon: ShieldCheck, tone: "text-rose-600 dark:text-rose-400" },
}

export function BusinessHealthCard({ overview, greeting, className }: { overview: HealthOverview; greeting?: string; className?: string }) {
  const meta = STATUS_META[overview.status] ?? STATUS_META.estable
  const Icon = meta.icon

  return (
    <div className={cn("flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/70 p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        {greeting ? <p className="text-sm font-semibold text-foreground">{greeting}</p> : <span />}
        <span className={cn("flex items-center gap-1.5 text-xs font-semibold", meta.tone)}>
          <Icon className="size-4" />
          {meta.label}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{overview.summary}</p>
      <div className="flex flex-wrap gap-1.5">
        {overview.counts.important > 0 ? (
          <Badge variant="destructive" className="normal-case">
            {overview.counts.important} importante{overview.counts.important === 1 ? "" : "s"}
          </Badge>
        ) : null}
        {overview.counts.warning > 0 ? (
          <Badge variant="secondary" className="normal-case">
            {overview.counts.warning} en seguimiento
          </Badge>
        ) : null}
        {overview.counts.info > 0 ? (
          <Badge variant="outline" className="normal-case">
            {overview.counts.info} informativo{overview.counts.info === 1 ? "" : "s"}
          </Badge>
        ) : null}
      </div>
    </div>
  )
}
