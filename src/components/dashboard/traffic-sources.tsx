"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Globe, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SourceItem {
  id: string
  label: string
  percentage: number
}

interface Props {
  sources?: SourceItem[]
}

const COLORS: Record<string, { cls: string; stroke: string }> = {
  direct: { cls: "bg-primary", stroke: "#0ea5e9" },
  social: { cls: "bg-blue-500", stroke: "#3b82f6" },
  search: { cls: "bg-emerald-500", stroke: "#10b981" },
  whatsapp: { cls: "bg-green-500", stroke: "#22c55e" },
  email: { cls: "bg-purple-500", stroke: "#a855f7" },
  qr: { cls: "bg-orange-500", stroke: "#f97316" },
}

const DEFAULT_COLOR = { cls: "bg-muted-foreground/20", stroke: "#94a3b8" }

export function TrafficSources({ sources = [] }: Props) {
  const sorted = useMemo(
    () => [...sources].sort((a, b) => b.percentage - a.percentage),
    [sources]
  )

  const totalPct = sources.reduce((s, x) => s + x.percentage, 0)
  const hasData = sources.length > 0 && totalPct > 0

  return (
    <Card className="rounded-3xl bg-card shadow-xs overflow-hidden">
      <CardHeader className="pb-4 pt-7 px-6">
        <CardTitle className="font-heading text-lg font-bold text-accent flex items-center gap-2">
          <Globe className="size-5 text-primary" />
          Tráfico Web
        </CardTitle>
        <p className="text-xs text-muted-foreground">Origen de visitas a tu tienda</p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex items-center justify-center mb-6 relative">
          {hasData ? (
            <svg viewBox="0 0 120 120" className="size-32 -rotate-90">
              {(() => {
                let offset = 0
                const r = 50, cx = 60, cy = 60
                const circumference = 2 * Math.PI * r
                return sorted.map((s) => {
                  const segment = circumference * (s.percentage / totalPct)
                  const dashArray = `${segment} ${circumference - segment}`
                  const dashOffset = -offset
                  offset += segment
                  const color = COLORS[s.id] || DEFAULT_COLOR
                  return (
                    <circle
                      key={s.id}
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill="none"
                      stroke={color.stroke}
                      strokeWidth="14"
                      strokeDasharray={dashArray}
                      strokeDashoffset={dashOffset}
                    />
                  )
                })
              })()}
            </svg>
          ) : (
            <svg viewBox="0 0 120 120" className="size-32">
              <circle cx={60} cy={60} r={50} fill="none" stroke="#e2e8f0" strokeWidth="14" />
            </svg>
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-black text-accent">{totalPct}%</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total</span>
          </div>
        </div>

        <div className="space-y-2.5">
          {sorted.length > 0 ? (
            sorted.map((s) => {
              const color = COLORS[s.id] || DEFAULT_COLOR
              return (
                <div key={s.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={cn("size-3 rounded-full shrink-0", color.cls)} />
                    <span className="text-sm font-semibold text-accent">{s.label}</span>
                  </div>
                  <span className="text-sm font-bold text-accent">{s.percentage}%</span>
                </div>
              )
            })
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">Aún no hay visitas registradas</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Comparte tu tienda para recibir tus primeras visitas</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
