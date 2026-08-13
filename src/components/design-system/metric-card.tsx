import * as React from "react"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"

import { cn } from "@/lib/utils"

interface MetricCardProps extends React.ComponentProps<"div"> {
  label: string
  value: string
  delta?: number
  icon?: React.ReactNode
}

function MetricCard({
  label,
  value,
  delta,
  icon,
  className,
  ...props
}: MetricCardProps) {
  const positive = (delta ?? 0) >= 0
  return (
    <div
      data-slot="metric-card"
      className={cn(
        "surface-card flex flex-col gap-2 rounded-xl p-4",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="font-heading text-2xl font-bold tabular-nums text-foreground">
          {value}
        </span>
        {typeof delta === "number" ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium",
              positive ? "text-success" : "text-destructive"
            )}
          >
            {positive ? (
              <ArrowUpRight className="size-3.5" />
            ) : (
              <ArrowDownRight className="size-3.5" />
            )}
            {Math.abs(delta)}%
          </span>
        ) : null}
      </div>
    </div>
  )
}

export { MetricCard }
