import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface MetricCardProps {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon: ReactNode
  accent?: "primary" | "brand" | "emerald" | "rose"
  className?: string
}

const accents = {
  primary: "bg-primary/10 text-primary",
  brand: "bg-brand/15 text-brand",
  emerald: "bg-emerald-500/10 text-emerald-600",
  rose: "bg-rose-500/10 text-rose-600",
}

export function MetricCard({
  label,
  value,
  sub,
  icon,
  accent = "primary",
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur-xl",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-xl", accents[accent])}>
          {icon}
        </span>
      </div>
      <p className="font-heading text-2xl font-bold tracking-tight text-foreground">{value}</p>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  )
}
