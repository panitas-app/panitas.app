"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, TrendingUp, TrendingDown } from "lucide-react"

interface Props {
  today: number
  week: number
  month: number
  trend: "up" | "down"
  trendPct: number
}

export function VisitorsPanel({ today, week, month, trend, trendPct }: Props) {
  return (
    <Card className="rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
      <CardHeader className="pb-4 pt-7 px-6 border-b border-slate-100 dark:border-slate-800">
        <CardTitle className="font-heading text-lg font-bold text-accent flex items-center gap-2">
          <Users className="size-5 text-primary" />
          Visitantes
        </CardTitle>
        <p className="text-xs text-slate-500 dark:text-slate-400">Personas que han visitado tu tienda</p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-black text-accent">{today}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">Hoy</p>
          </div>
          <div className="text-center border-x border-slate-100 dark:border-slate-800">
            <p className="text-2xl font-black text-accent">{week}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">Semana</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-accent">{month}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">Mes</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          {trend === "up" ? (
            <TrendingUp className="size-4 text-emerald-500" />
          ) : (
            <TrendingDown className="size-4 text-red-400" />
          )}
          <span className="text-xs font-bold text-accent">{trendPct}% vs mes anterior</span>
        </div>
      </CardContent>
    </Card>
  )
}
