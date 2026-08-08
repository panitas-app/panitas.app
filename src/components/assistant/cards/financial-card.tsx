"use client"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { RichBlock } from "@/lib/conversational-actions"
import { iconByName } from "@/components/assistant/renderers/icons"
import { TONE, formatValue } from "@/components/assistant/renderers/styles"

/** Tarjeta financiera (FASE 5E): utilidad, margen, break-even y estructura de gastos. */
export function FinancialCard({ block }: { block: Extract<RichBlock, { kind: "financial" }> }) {
  return (
    <Card className="rounded-2xl border bg-card/60">
      <CardHeader className="px-4 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-semibold">{block.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pt-0">
        {block.metrics.length ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {block.metrics.map((metric, i) => {
              const tone = TONE[metric.tone ?? "default"]
              const Icon = metric.icon ? iconByName(metric.icon) : null
              return (
                <div key={i} className={cn("rounded-xl border px-3 py-2", tone.bg, tone.border)}>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {Icon ? <Icon className={cn("size-3", tone.text)} aria-hidden /> : null}
                    <span>{metric.label}</span>
                  </div>
                  <div className={cn("mt-0.5 truncate text-lg font-bold", tone.text)}>{formatValue(metric.value)}</div>
                </div>
              )
            })}
          </div>
        ) : null}

        {block.breakEven ? (
          <div className="rounded-xl border border-border/60 bg-card/70 px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Punto de equilibrio</p>
            <p className="mt-0.5 text-sm font-semibold">{formatValue(block.breakEven.revenue)} en ventas</p>
            <p className="text-xs text-muted-foreground">
              {block.breakEven.units != null ? `${Math.round(block.breakEven.units)} unidades` : ""} · margen {Math.round(block.breakEven.margin * 100)}%
            </p>
          </div>
        ) : null}

        {block.expenseBreakdown?.length ? (
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Estructura de gastos</p>
            {block.expenseBreakdown.map((entry, i) => {
              const width = Math.min(100, Math.max(4, entry.percentage * 100))
              return (
                <div key={i} className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{entry.label}</span>
                    <span className="font-medium text-foreground">{formatValue(entry.value)} · {Math.round(width)}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
