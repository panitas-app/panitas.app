"use client"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import type { RichBlock } from "@/lib/conversational-actions"
import { iconByName } from "@/components/assistant/renderers/icons"
import { TONE, formatValue } from "@/components/assistant/renderers/styles"

/** Grid de KPIs (FASE 5E): métricas con icono, tono y tendencia. Responsive 1→4 columnas. */
export function KpiGrid({ block }: { block: Extract<RichBlock, { kind: "kpi" }> }) {
  return (
    <div data-slot="assistant-kpis" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {block.items.map((item, i) => {
        const tone = TONE[item.tone ?? "default"]
        const Icon = item.icon ? iconByName(item.icon) : null
        return (
          <Card key={i} className={cn("rounded-2xl border p-4", tone.bg, tone.border)}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{item.label}</span>
              {Icon ? <Icon className={cn("size-4", tone.text)} aria-hidden /> : null}
            </div>
            <div className={cn("mt-2 truncate text-2xl font-bold tracking-tight", tone.text)}>{formatValue(item.value)}</div>
            {item.delta !== undefined ? (
              <div className={cn("mt-1 flex items-center gap-1 text-xs font-medium", item.delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                <span aria-hidden>{item.delta >= 0 ? "↑" : "↓"}</span>
                {Math.abs(item.delta).toFixed(1)}%
                <span className="font-normal text-muted-foreground">vs. anterior</span>
              </div>
            ) : null}
          </Card>
        )
      })}
    </div>
  )
}
