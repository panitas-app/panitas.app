"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tag, Sparkles } from "lucide-react"

interface CategoryItem {
  name: string
  count: number
  sales: number
  color?: string
}

interface Props {
  type: "category" | "service"
  items: CategoryItem[]
}

const COLORS_CYCLE = ["#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6", "#f97316"]

export function CategoryStats({ type, items }: Props) {
  const sorted = useMemo(() => {
    const withColors = items.map((item, i) => ({
      ...item,
      color: item.color || COLORS_CYCLE[i % COLORS_CYCLE.length],
    }))
    return [...withColors].sort((a, b) => (b.sales || b.count) - (a.sales || a.count))
  }, [items])

  const best = sorted[0]
  const total = sorted.reduce((s, x) => s + (x.sales || x.count), 0)
  const label = type === "category" ? "categoría" : "servicio"
  const labelPl = type === "category" ? "Categorías" : "Servicios"

  return (
    <Card className="rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
      <CardHeader className="pb-4 pt-7 px-6 border-b border-slate-100 dark:border-slate-800">
        <CardTitle className="font-heading text-lg font-bold text-accent flex items-center gap-2">
          <Tag className="size-5 text-primary" />
          {labelPl} más vendidos
        </CardTitle>
        <p className="text-xs text-slate-500 dark:text-slate-400">Distribución de ventas por {label}</p>
      </CardHeader>
      <CardContent className="p-6">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-slate-400 dark:text-slate-500">
            <Tag className="size-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold">Sin {labelPl.toLowerCase()} registradas</p>
          </div>
        ) : (
          <>
            {/* Donut chart */}
            <div className="flex items-center justify-center mb-6 relative">
              <svg viewBox="0 0 120 120" className="size-32 -rotate-90">
                {(() => {
                  let offset = 0
                  const r = 50, cx = 60, cy = 60
                  const circumference = 2 * Math.PI * r
                  return sorted.map((item) => {
                    const segment = circumference * ((item.sales || item.count) / total)
                    const dashArray = `${segment} ${circumference - segment}`
                    const dashOffset = -offset
                    offset += segment
                    return (
                      <circle
                        key={item.name}
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill="none"
                        stroke={item.color}
                        strokeWidth="14"
                        strokeDasharray={dashArray}
                        strokeDashoffset={dashOffset}
                      />
                    )
                  })
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-accent">{sorted.length}</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{labelPl}</span>
              </div>
            </div>

            {/* Best seller highlight */}
            {best && (
              <div className="flex items-center gap-3 p-3 mb-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                <Sparkles className="size-5 text-amber-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Más vendido</p>
                  <p className="text-sm font-black text-accent truncate">{best.name}</p>
                </div>
                <div className="text-right shrink-0 ml-auto">
                  <p className="text-sm font-black text-accent">{best.sales || best.count}</p>
                  <p className="text-[10px] text-muted-foreground">ventas</p>
                </div>
              </div>
            )}

            {/* List */}
            <div className="space-y-2.5">
              {sorted.map((item) => {
                const pct = total > 0 ? Math.round(((item.sales || item.count) / total) * 100) : 0
                return (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-semibold text-accent truncate">{item.name}</span>
                        <span className="text-xs font-bold text-muted-foreground">{pct}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
