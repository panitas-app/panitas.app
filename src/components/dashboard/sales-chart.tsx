"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

const WEEKDAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

type Period = "day" | "week" | "month" | "custom"

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function startOfWeek(d: Date): Date {
  const x = startOfDay(d)
  x.setDate(x.getDate() - x.getDay())
  return x
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isSameOrBefore(a: Date, b: Date): boolean {
  return a.getTime() <= b.getTime()
}

function dateInRange(d: Date, start: Date, end: Date): boolean {
  const t = startOfDay(d).getTime()
  return t >= start.getTime() && t <= end.getTime()
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString("es-VE", { day: "numeric", month: "short" })
}

function formatInputValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function parseInputValue(s: string): Date | null {
  const parts = s.split("-").map(Number)
  if (parts.length !== 3 || parts.some((n) => isNaN(n))) return null
  return new Date(parts[0], parts[1] - 1, parts[2])
}

export function SalesChart({ orders, bcvRate }: Props) {
  const [period, setPeriod] = useState<Period>("week")
  const today = useMemo(() => startOfDay(new Date()), [])

  const [customStart, setCustomStart] = useState<Date>(() => {
    const d = new Date(today)
    d.setDate(d.getDate() - 30)
    return startOfDay(d)
  })
  const [customEnd, setCustomEnd] = useState<Date>(today)

  const { bars, totalUsd, totalVes, barLabel } = useMemo(() => {
    let label = ""

    if (period === "day") {
      label = `Hoy, ${today.toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "long" })}`

      let totalUsd = 0
      let totalVes = 0
      const hours = []
      for (let h = 0; h < 24; h++) {
        const hourOrders = orders.filter((o) => {
          const d = new Date(o.createdAt)
          return isSameDay(d, today) && d.getHours() === h
        })
        const usd = hourOrders.reduce((s, o) => s + o.total, 0)
        const ves = hourOrders.reduce((s, o) => s + o.total * (o.bcvRateAtOrder || bcvRate), 0)
        totalUsd += usd
        totalVes += ves
        hours.push({ label: `${h.toString().padStart(2, "0")}:00`, shortLabel: `${h.toString().padStart(2, "0")}h`, usd, orders: hourOrders.length })
      }
      return { bars: hours, totalUsd, totalVes, barLabel: label }
    }

    if (period === "week") {
      const weeksToShow = 8
      const thisWeekStart = startOfWeek(today)
      const earliestWeekStart = new Date(thisWeekStart)
      earliestWeekStart.setDate(earliestWeekStart.getDate() - (weeksToShow - 1) * 7)

      label = `Últimas ${weeksToShow} semanas`

      const weekBars = []
      let totalUsd = 0
      let totalVes = 0
      for (let i = 0; i < weeksToShow; i++) {
        const ws = new Date(earliestWeekStart)
        ws.setDate(ws.getDate() + i * 7)
        const we = new Date(ws)
        we.setDate(we.getDate() + 6)
        const weekOrders = orders.filter((o) => {
          const d = startOfDay(new Date(o.createdAt))
          return d.getTime() >= ws.getTime() && d.getTime() <= we.getTime()
        })
        const usd = weekOrders.reduce((s, o) => s + o.total, 0)
        const ves = weekOrders.reduce((s, o) => s + o.total * (o.bcvRateAtOrder || bcvRate), 0)
        totalUsd += usd
        totalVes += ves

        const startLabel = ws.toLocaleDateString("es-VE", { day: "numeric", month: "short" })
        const endLabel = we.toLocaleDateString("es-VE", { day: "numeric", month: "short" })
        weekBars.push({
          label: `${startLabel} - ${endLabel}`,
          shortLabel: `${ws.getDate()}/${ws.getMonth() + 1}`,
          usd,
          orders: weekOrders.length,
        })
      }
      return { bars: weekBars, totalUsd, totalVes, barLabel: label }
    }

    if (period === "month") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      label = `${MONTH_NAMES[today.getMonth()]} ${today.getFullYear()}`

      const days: Date[] = []
      const cursor = new Date(start)
      while (isSameOrBefore(cursor, end)) {
        days.push(new Date(cursor))
        cursor.setDate(cursor.getDate() + 1)
      }
      let totalUsd = 0
      let totalVes = 0
      const dayBars = days.map((day) => {
        const dayOrders = orders.filter((o) => isSameDay(new Date(o.createdAt), day))
        const usd = dayOrders.reduce((s, o) => s + o.total, 0)
        const ves = dayOrders.reduce((s, o) => s + o.total * (o.bcvRateAtOrder || bcvRate), 0)
        totalUsd += usd
        totalVes += ves
        return {
          label: `${day.getDate()}/${day.getMonth() + 1}`,
          shortLabel: String(day.getDate()),
          usd,
          orders: dayOrders.length,
        }
      })
      return { bars: dayBars, totalUsd, totalVes, barLabel: label }
    }

    // period === "custom"
    const start = customStart
    const end = customEnd
    label = `${formatDateShort(start)} - ${formatDateShort(end)}`

    if (start.getTime() > end.getTime()) {
      return { bars: [], totalUsd: 0, totalVes: 0, barLabel: "El rango no es válido (inicio > fin)" }
    }

    const rangeDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const maxBars = 90
    let computedBars: { label: string; shortLabel: string; usd: number; orders: number }[] = []
    let totalUsd = 0
    let totalVes = 0

    if (rangeDays <= maxBars) {
      const days: Date[] = []
      const cursor = new Date(start)
      while (isSameOrBefore(cursor, end)) {
        days.push(new Date(cursor))
        cursor.setDate(cursor.getDate() + 1)
      }
      computedBars = days.map((day) => {
        const dayOrders = orders.filter((o) => isSameDay(new Date(o.createdAt), day))
        const usd = dayOrders.reduce((s, o) => s + o.total, 0)
        const ves = dayOrders.reduce((s, o) => s + o.total * (o.bcvRateAtOrder || bcvRate), 0)
        totalUsd += usd
        totalVes += ves
        return {
          label: day.toLocaleDateString("es-VE", { weekday: "short", day: "numeric", month: "short" }),
          shortLabel: `${day.getDate()}/${day.getMonth() + 1}`,
          usd,
          orders: dayOrders.length,
        }
      })
    } else {
      const weeksCount = Math.ceil(rangeDays / 7)
      for (let i = 0; i < weeksCount; i++) {
        const ws = new Date(start)
        ws.setDate(ws.getDate() + i * 7)
        const we = new Date(ws)
        we.setDate(we.getDate() + 6)
        if (we.getTime() > end.getTime()) we.setTime(end.getTime())
        const weekOrders = orders.filter((o) => {
          const d = startOfDay(new Date(o.createdAt))
          return d.getTime() >= ws.getTime() && d.getTime() <= we.getTime()
        })
        const usd = weekOrders.reduce((s, o) => s + o.total, 0)
        const ves = weekOrders.reduce((s, o) => s + o.total * (o.bcvRateAtOrder || bcvRate), 0)
        totalUsd += usd
        totalVes += ves
        computedBars.push({
          label: `${formatDateShort(ws)} - ${formatDateShort(we)}`,
          shortLabel: `${ws.getDate()}/${ws.getMonth() + 1}`,
          usd,
          orders: weekOrders.length,
        })
      }
    }
    return { bars: computedBars, totalUsd, totalVes, barLabel: label }
  }, [period, customStart, customEnd, today, orders, bcvRate])

  const maxUsd = Math.max(...bars.map((b) => b.usd), 1)

  const periodLabel: Record<Period, string> = {
    day: "del día",
    week: "semanales",
    month: "del mes",
    custom: "personalizadas",
  }

  return (
    <Card className="rounded-3xl bg-card shadow-xs overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-4 pt-7 px-6">
        <div className="space-y-1">
          <CardTitle className="font-heading text-lg font-bold text-accent flex items-center gap-2">
            <TrendingUp className="size-5 text-primary" />
            Ventas {periodLabel[period]}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{barLabel}</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex rounded-xl bg-muted p-0.5">
            {(["day", "week", "month", "custom"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all",
                  period === p
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground/80",
                )}
              >
                {p === "day" ? "Día" : p === "week" ? "Semana" : p === "month" ? "Mes" : "Personalizado"}
              </button>
            ))}
          </div>
          {period === "custom" && (
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Desde
                <input
                  type="date"
                  value={formatInputValue(customStart)}
                  max={formatInputValue(customEnd)}
                  onChange={(e) => {
                    const d = parseInputValue(e.target.value)
                    if (d) setCustomStart(startOfDay(d))
                  }}
                  className="h-9 rounded-lg border border-input bg-background px-2 text-xs text-foreground"
                />
              </label>
              <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Hasta
                <input
                  type="date"
                  value={formatInputValue(customEnd)}
                  min={formatInputValue(customStart)}
                  max={formatInputValue(today)}
                  onChange={(e) => {
                    const d = parseInputValue(e.target.value)
                    if (d) setCustomEnd(startOfDay(d))
                  }}
                  className="h-9 rounded-lg border border-input bg-background px-2 text-xs text-foreground"
                />
              </label>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {/* Totals bar */}
        <div className="flex items-center gap-6 mb-6 pb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total USD</p>
            <p className="text-xl font-black text-accent">${totalUsd.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Bs</p>
            <p className="text-xl font-black text-accent">Bs. {totalVes.toFixed(2)}</p>
          </div>
        </div>

        {/* Chart */}
        {bars.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <CalendarDays className="size-8 text-muted-foreground/70" />
            <p className="text-sm font-semibold">Sin datos para este período</p>
          </div>
        ) : (
          <div
            className="grid gap-1.5 sm:gap-3 items-end overflow-x-auto"
            style={{ gridTemplateColumns: `repeat(${Math.min(bars.length, 31)}, minmax(28px, 1fr))` }}
          >
            {bars.map((bar, idx) => {
              const pct = maxUsd > 0 ? (bar.usd / maxUsd) * 100 : 0
              const showShort = bars.length > 14
              return (
                <div key={`${bar.label}-${idx}`} className="flex flex-col items-center gap-1.5">
                  <div className="relative w-full flex flex-col items-center justify-end" style={{ height: 140 }}>
                    <div
                      className="w-full max-w-[32px] rounded-lg bg-gradient-to-t from-primary/80 to-primary/30 transition-all duration-500 hover:from-primary hover:to-primary/50 cursor-pointer group relative"
                      style={{ height: `${Math.max(pct, 4)}%` }}
                    >
                      <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap z-10">
                        ${bar.usd.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <span
                    className="text-[10px] text-muted-foreground font-semibold text-center leading-tight"
                    style={{ writingMode: bars.length > 20 ? "vertical-rl" : "horizontal-tb", transform: bars.length > 20 ? "rotate(180deg)" : "none" }}
                  >
                    {showShort ? bar.shortLabel : bar.label}
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
