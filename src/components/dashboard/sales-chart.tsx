"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarDays, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface OrderData {
  id: string
  total: number
  bcvRateAtOrder: number | null
  createdAt: Date
}

interface Props {
  orders: OrderData[]
  bcvRate: number
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

type Period = "day" | "week" | "month" | "custom"

function getDaysInRange(start: Date, end: Date): Date[] {
  const days: Date[] = []
  const current = new Date(start)
  while (current <= end) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return days
}

function formatDayShort(d: Date): string {
  return d.toLocaleDateString("es-VE", { day: "numeric" })
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function SalesChart({ orders, bcvRate }: Props) {
  const [period, setPeriod] = useState<Period>("week")
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const [customYear, setCustomYear] = useState(today.getFullYear())
  const [customMonth, setCustomMonth] = useState(today.getMonth())

  const { bars, totalUsd, totalVes, barLabel } = useMemo(() => {
    let start: Date
    let end: Date
    let label: string

    if (period === "day") {
      start = new Date(today)
      end = new Date(today)
      label = `Hoy, ${today.toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "long" })}`
    } else if (period === "week") {
      const dayOfWeek = today.getDay()
      start = new Date(today)
      start.setDate(today.getDate() - dayOfWeek)
      end = new Date(start)
      end.setDate(start.getDate() + 6)
      label = `Semana del ${formatDayShort(start)} al ${formatDayShort(end)}`
    } else if (period === "month") {
      start = new Date(today.getFullYear(), today.getMonth(), 1)
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      label = MONTH_NAMES[today.getMonth()]
    } else {
      start = new Date(customYear, customMonth, 1)
      end = new Date(customYear, customMonth + 1, 0)
      label = `${MONTH_NAMES[customMonth]} ${customYear}`
    }

    let totalUsd = 0
    let totalVes = 0

    if (period === "day") {
      // Hourly breakdown
      const hours: { label: string; usd: number; orders: number }[] = []
      for (let h = 0; h < 24; h++) {
        const hourOrders = orders.filter((o) => {
          const d = new Date(o.createdAt)
          return isSameDay(d, today) && d.getHours() === h
        })
        const usd = hourOrders.reduce((s, o) => s + o.total, 0)
        const ves = hourOrders.reduce((s, o) => s + o.total * (o.bcvRateAtOrder || bcvRate), 0)
        totalUsd += usd
        totalVes += ves
        hours.push({
          label: `${h.toString().padStart(2, "0")}:00`,
          usd,
          orders: hourOrders.length,
        })
      }
      return { bars: hours, totalUsd, totalVes, barLabel: label }
    }

    const days = getDaysInRange(start, end)
    const salesByDay = days.map((day) => {
      const dayOrders = orders.filter((o) => {
        const d = new Date(o.createdAt)
        d.setHours(0, 0, 0, 0)
        return isSameDay(d, day)
      })
      const usd = dayOrders.reduce((sum, o) => sum + o.total, 0)
      const ves = dayOrders.reduce((sum, o) => sum + o.total * (o.bcvRateAtOrder || bcvRate), 0)
      totalUsd += usd
      totalVes += ves
      return { label: formatDayShort(day), usd, date: day }
    })

    return { bars: salesByDay, totalUsd, totalVes, barLabel: label }
  }, [period, customYear, customMonth, today, orders, bcvRate])

  const maxUsd = Math.max(...bars.map((b) => b.usd), 1)

  const years = useMemo(() => {
    const y = []
    for (let i = today.getFullYear(); i >= today.getFullYear() - 3; i--) {
      y.push(i)
    }
    return y
  }, [today])

  return (
    <Card className="rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4 pt-7 px-6 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <CardTitle className="font-heading text-lg font-bold text-accent flex items-center gap-2">
            <TrendingUp className="size-5 text-primary" />
            Ventas {period === "day" ? "del día" : period === "week" ? "semanales" : period === "month" ? "del mes" : "mensuales"}
          </CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400">{barLabel}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
            {(["day", "week", "month", "custom"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all",
                    period === p
                      ? "bg-white dark:bg-slate-700 text-accent shadow-xs"
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300",
                )}
              >
                {p === "day" ? "Día" : p === "week" ? "Semana" : p === "month" ? "Mes" : "Personalizado"}
              </button>
            ))}
          </div>
          {period === "custom" && (
            <div className="flex items-center gap-1.5">
              <Select value={String(customMonth)} onValueChange={(v) => setCustomMonth(Number(v))}>
                <SelectTrigger className="h-9 w-[100px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, i) => (
                    <SelectItem key={i} value={String(i)} className="text-xs">{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(customYear)} onValueChange={(v) => setCustomYear(Number(v))}>
                <SelectTrigger className="h-9 w-[80px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {/* Totals bar */}
        <div className="flex items-center gap-6 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total USD</p>
            <p className="text-xl font-black text-accent">${totalUsd.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Bs</p>
            <p className="text-xl font-black text-accent">Bs. {totalVes.toFixed(2)}</p>
          </div>
        </div>

        {/* Chart */}
        {bars.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-slate-400 dark:text-slate-500">
            <CalendarDays className="size-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold">Sin datos para este período</p>
          </div>
        ) : (
          <div className="grid gap-1.5 sm:gap-3 items-end" style={{ gridTemplateColumns: `repeat(${Math.min(bars.length, 31)}, 1fr)` }}>
            {bars.map((bar) => {
              const pct = maxUsd > 0 ? (bar.usd / maxUsd) * 100 : 0
              return (
                <div key={bar.label} className="flex flex-col items-center gap-1.5">
                  <div className="relative w-full flex flex-col items-center justify-end" style={{ height: 120 }}>
                    <div
                      className="w-full max-w-[32px] rounded-lg bg-gradient-to-t from-primary/80 to-primary/30 transition-all duration-500 hover:from-primary hover:to-primary/50 cursor-pointer group relative"
                      style={{ height: `${Math.max(pct, 4)}%` }}
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap">
                        ${bar.usd.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold text-center leading-tight">
                    {bar.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
