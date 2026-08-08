"use client"

import Link from "next/link"
import { Bot, Sparkles } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { assistantHref, CATEGORY_ICONS, money, PRIORITY_META, type FinancialInsight } from "./financial-types"

interface InsightsListProps {
  insights: FinancialInsight[]
}

function valueLabel(insight: FinancialInsight): string | null {
  if (insight.value === undefined || insight.value === null) return null
  const isPct =
    insight.category === "ventas_crecieron" ||
    insight.category === "ventas_cayeron" ||
    insight.category === "gastos_aumentaron" ||
    insight.category === "deuda_concentrada" ||
    insight.category === "recuperacion_creditos"
  return isPct ? `${Math.abs(insight.value).toFixed(0)}%` : money(insight.value)
}

export function InsightsList({ insights }: InsightsListProps) {
  if (insights.length === 0) {
    return (
      <Card className="gap-2">
        <CardContent className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <Sparkles className="size-8 text-muted-foreground/40" />
          <p className="text-sm font-bold text-foreground">Todo en orden</p>
          <p className="text-xs text-muted-foreground">
            No hay alertas financieras que requieran tu atención en este período.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {insights.map((insight) => {
        const meta = PRIORITY_META[insight.priority]
        const Icon = CATEGORY_ICONS[insight.category] ?? Sparkles
        const value = valueLabel(insight)
        return (
          <Card key={insight.id} size="sm" className={cn("gap-2 border-l-4", meta.border)}>
            <CardContent className="space-y-2.5">
              <div className="flex items-start gap-3">
                <div className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted", meta.text)}>
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className="text-sm font-bold leading-tight text-foreground">{insight.title}</h3>
                    {value && <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-black", meta.chip)}>{value}</span>}
                  </div>
                  {insight.description && (
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{insight.description}</p>
                  )}
                </div>
              </div>

              {insight.actions.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pl-11">
                  {insight.actions.map((action, index) =>
                    action.type === "link" ? (
                      <Link
                        key={index}
                        href={action.href ?? "/dashboard/finanzas"}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-bold text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                      >
                        {action.label}
                      </Link>
                    ) : (
                      <Link
                        key={index}
                        href={assistantHref(action.prompt ?? "cómo está la salud financiera de mi negocio")}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-bold text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                      >
                        <Bot className="size-3.5" />
                        {action.label}
                      </Link>
                    ),
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
