"use client"

import { useState, useMemo, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { CalendarDays, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useBcvRate } from "@/lib/bcv-context"

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

type Period = "day" | "week" | "month" | "custom"

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

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

function fmtShortDate(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

function fmtInput(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function parseInput(s: string): Date | null {
  const p = s.split("-").map(Number)
  if (p.length !== 3 || p.some(isNaN)) return null
  return new Date(p[0], p[1] - 1, p[2])
}

interface Bar {
  label: string
  shortLabel: string
  tooltipLabel: string
  usd: number
  ves: number
  orderCount: number
}

function computeBars(
  period: Period,
  customStart: Date,
  customEnd: Date,
  today: Date,
  orders: OrderData[],
  bcvRate: number,
): { bars: Bar[]; totalUsd: number; totalVes: number; subtitle: string; avgUsd: number; maxUsd: number } {
  const toVes = (o: OrderData) => o.total * (o.bcvRateAtOrder || bcvRate)

  function aggregate(filtered: OrderData[]): { usd: number; ves: number } {
    let usd = 0, ves = 0
    for (const o of filtered) { usd += o.total; ves += toVes(o) }
    return { usd, ves }
  }

  if (period === "day") {
    const daysCount = 7
    const bars: Bar[] = []
    let totalUsd = 0, totalVes = 0
    const startDay = new Date(today)
    startDay.setDate(startDay.getDate() - (daysCount - 1))
    const subtitle = `${fmtShortDate(startDay)} – ${fmtShortDate(today)}`
    for (let i = 0; i < daysCount; i++) {
      const day = new Date(startDay)
      day.setDate(day.getDate() + i)
      const filtered = orders.filter((o) => isSameDay(new Date(o.createdAt), day))
      const { usd, ves } = aggregate(filtered)
      totalUsd += usd; totalVes += ves
      const isToday = isSameDay(day, today)
      bars.push({
        label: `${WEEKDAYS[day.getDay()]} ${day.getDate()}`,
        shortLabel: `${day.getDate()}`,
        tooltipLabel: `${WEEKDAYS[day.getDay()]} ${day.getDate()} ${MONTHS[day.getMonth()]}${isToday ? " (Hoy)" : ""}`,
        usd, ves, orderCount: filtered.length,
      })
    }
    const nonZero = bars.filter((b) => b.usd > 0)
    return {
      bars, totalUsd, totalVes, subtitle,
      avgUsd: nonZero.length > 0 ? totalUsd / nonZero.length : 0,
      maxUsd: Math.max(...bars.map((b) => b.usd), 1),
    }
  }

  if (period === "week") {
    const weeksCount = 8
    const thisWeekStart = startOfWeek(today)
    const earliest = new Date(thisWeekStart)
    earliest.setDate(earliest.getDate() - (weeksCount - 1) * 7)
    const bars: Bar[] = []
    let totalUsd = 0, totalVes = 0
    for (let i = 0; i < weeksCount; i++) {
      const ws = new Date(earliest)
      ws.setDate(ws.getDate() + i * 7)
      const we = new Date(ws)
      we.setDate(we.getDate() + 6)
      const filtered = orders.filter((o) => {
        const d = startOfDay(new Date(o.createdAt))
        return d >= ws && d <= we
      })
      const { usd, ves } = aggregate(filtered)
      totalUsd += usd; totalVes += ves
      bars.push({
        label: `${fmtShortDate(ws)} - ${fmtShortDate(we)}`,
        shortLabel: `${ws.getDate()}/${ws.getMonth() + 1}`,
        tooltipLabel: `${fmtShortDate(ws)} – ${fmtShortDate(we)}`,
        usd, ves, orderCount: filtered.length,
      })
    }
    const nonZero = bars.filter((b) => b.usd > 0)
    return {
      bars, totalUsd, totalVes,
      subtitle: `Últimas ${weeksCount} semanas`,
      avgUsd: nonZero.length > 0 ? totalUsd / nonZero.length : 0,
      maxUsd: Math.max(...bars.map((b) => b.usd), 1),
    }
  }

  if (period === "month") {
    const monthsCount = 12
    const bars: Bar[] = []
    let totalUsd = 0, totalVes = 0
    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      const filtered = orders.filter((o) => {
        const od = new Date(o.createdAt)
        return od >= d && od <= monthEnd
      })
      const { usd, ves } = aggregate(filtered)
      totalUsd += usd; totalVes += ves
      const isCurrentMonth = d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
      bars.push({
        label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
        shortLabel: `${MONTHS[d.getMonth()]}`,
        tooltipLabel: `${MONTHS[d.getMonth()]} ${d.getFullYear()}${isCurrentMonth ? " (Actual)" : ""}`,
        usd, ves, orderCount: filtered.length,
      })
    }
    const subtitle = `${MONTHS[bars[0] ? new Date(today.getFullYear(), today.getMonth() - monthsCount + 1, 1).getMonth() : today.getMonth()]} ${new Date(today.getFullYear(), today.getMonth() - monthsCount + 1, 1).getFullYear()} – ${MONTHS[today.getMonth()]} ${today.getFullYear()}`
    const nonZero = bars.filter((b) => b.usd > 0)
    return {
      bars, totalUsd, totalVes, subtitle,
      avgUsd: nonZero.length > 0 ? totalUsd / nonZero.length : 0,
      maxUsd: Math.max(...bars.map((b) => b.usd), 1),
    }
  }

  // custom range
  if (customStart > customEnd) {
    return { bars: [], totalUsd: 0, totalVes: 0, subtitle: "Rango inválido", avgUsd: 0, maxUsd: 1 }
  }

  const rangeDays = Math.floor((customEnd.getTime() - customStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const subtitle = `${fmtShortDate(customStart)} – ${fmtShortDate(customEnd)}`
  const bars: Bar[] = []
  let totalUsd = 0, totalVes = 0

  if (rangeDays <= 60) {
    const cursor = new Date(customStart)
    while (cursor <= customEnd) {
      const day = new Date(cursor)
      const filtered = orders.filter((o) => isSameDay(new Date(o.createdAt), day))
      const { usd, ves } = aggregate(filtered)
      totalUsd += usd; totalVes += ves
      bars.push({
        label: `${day.getDate()} ${MONTHS[day.getMonth()]}`,
        shortLabel: `${day.getDate()}/${day.getMonth() + 1}`,
        tooltipLabel: `${WEEKDAYS[day.getDay()]} ${day.getDate()} ${MONTHS[day.getMonth()]}`,
        usd, ves, orderCount: filtered.length,
      })
      cursor.setDate(cursor.getDate() + 1)
    }
  } else {
    const weeksCount = Math.ceil(rangeDays / 7)
    for (let i = 0; i < weeksCount; i++) {
      const ws = new Date(customStart)
      ws.setDate(ws.getDate() + i * 7)
      const we = new Date(ws)
      we.setDate(we.getDate() + 6)
      if (we > customEnd) we.setTime(customEnd.getTime())
      const filtered = orders.filter((o) => {
        const d = startOfDay(new Date(o.createdAt))
        return d >= ws && d <= we
      })
      const { usd, ves } = aggregate(filtered)
      totalUsd += usd; totalVes += ves
      bars.push({
        label: `${fmtShortDate(ws)} - ${fmtShortDate(we)}`,
        shortLabel: `${ws.getDate()}/${ws.getMonth() + 1}`,
        tooltipLabel: `${fmtShortDate(ws)} – ${fmtShortDate(we)}`,
        usd, ves, orderCount: filtered.length,
      })
    }
  }

  const nonZero = bars.filter((b) => b.usd > 0)
  return {
    bars, totalUsd, totalVes, subtitle,
    avgUsd: nonZero.length > 0 ? totalUsd / nonZero.length : 0,
    maxUsd: Math.max(...bars.map((b) => b.usd), 1),
  }
}

export function SalesChart({ orders, bcvRate }: Props) {
  const { rate, showBolivares } = useBcvRate()
  const [period, setPeriod] = useState<Period>("week")
  const [now, setNow] = useState(() => startOfDay(new Date()))
  const today = now

  const [customStart, setCustomStart] = useState<Date>(() => {
    const d = new Date(today)
    d.setDate(d.getDate() - 30)
    return startOfDay(d)
  })
  const [customEnd, setCustomEnd] = useState<Date>(today)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const { bars, totalUsd, totalVes, subtitle, avgUsd, maxUsd } = useMemo(
    () => computeBars(period, customStart, customEnd, today, orders, rate),
    [period, customStart, customEnd, today, orders, rate],
  )

  const barWidth = useMemo(() => {
    const count = bars.length
    if (count <= 7) return 52
    if (count <= 12) return 44
    if (count <= 14) return 36
    if (count <= 31) return 24
    return 18
  }, [bars.length])

  const handlePeriodChange = useCallback((p: Period) => {
    setPeriod(p)
    setNow(startOfDay(new Date()))
  }, [])

  const activeRate = rate || bcvRate

  return (
    <Card className="rounded-2xl bg-card shadow-xs overflow-hidden border border-border/50">
      <CardContent className="p-4 sm:p-6">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="size-4 text-primary" />
              </div>
              <h3 className="font-heading text-base sm:text-lg font-bold text-foreground">Historial de ventas</h3>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium pl-10">{subtitle}</p>
          </div>

          {/* Period tabs */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex rounded-xl bg-muted/70 p-0.5">
              {([["day", "Día"], ["week", "Semana"], ["month", "Mes"], ["custom", "Rango"]] as [Period, string][]).map(([p, label]) => (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={cn(
                    "px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all duration-200",
                    period === p
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground/70",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Custom date inputs */}
        {period === "custom" && (
          <div className="flex items-center gap-2 mb-5 pl-10 flex-wrap">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              Desde
              <input
                type="date"
                value={fmtInput(customStart)}
                max={fmtInput(customEnd)}
                onChange={(e) => { const d = parseInput(e.target.value); if (d) setCustomStart(startOfDay(d)) }}
                className="h-8 rounded-lg border border-input bg-background px-2 text-xs text-foreground"
              />
            </label>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              Hasta
              <input
                type="date"
                value={fmtInput(customEnd)}
                min={fmtInput(customStart)}
                max={fmtInput(today)}
                onChange={(e) => { const d = parseInput(e.target.value); if (d) setCustomEnd(startOfDay(d)) }}
                className="h-8 rounded-lg border border-input bg-background px-2 text-xs text-foreground"
              />
            </label>
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <SummaryCard label="Total" value={totalUsd} ves={totalVes} showVes={showBolivares} accent />
          <SummaryCard label="Promedio" value={avgUsd} ves={avgUsd * activeRate} showVes={showBolivares} />
          <SummaryCard label="Máximo" value={maxUsd} ves={maxUsd * activeRate} showVes={showBolivares} />
          <SummaryCard label="Pedidos" value={null} count={bars.reduce((s, b) => s + b.orderCount, 0)} />
        </div>

        {/* Chart */}
        {bars.length === 0 || bars.every((b) => b.usd === 0 && b.orderCount === 0) ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/50">
              <CalendarDays className="size-5 text-muted-foreground/50" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground/80">Sin ventas en este período</p>
              <p className="text-xs text-muted-foreground mt-1">Las ventas aparecerán aquí cuando registres pedidos</p>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="overflow-x-auto pb-2 scrollbar-thin">
              <div
                className="flex items-end gap-[3px] sm:gap-1.5"
                style={{ minWidth: bars.length * (barWidth + 6) }}
              >
                {bars.map((bar, idx) => {
                  const pct = maxUsd > 0 ? (bar.usd / maxUsd) * 100 : 0
                  const isHovered = hoveredIdx === idx
                  const showLabel = bars.length <= 14 || idx % Math.ceil(bars.length / 14) === 0 || idx === bars.length - 1
                  const isToday = period === "day"
                    ? idx === bars.length - 1
                    : period === "month"
                      ? idx === bars.length - 1
                      : false

                  return (
                    <div
                      key={idx}
                      className="flex flex-col items-center gap-1 relative"
                      style={{ width: barWidth, minWidth: barWidth }}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    >
                      {/* Tooltip */}
                      {isHovered && (
                        <div className="absolute bottom-full mb-2 z-20 pointer-events-none">
                          <div className="bg-foreground text-background text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                            <div>{bar.tooltipLabel}</div>
                            <div className="text-background/80 font-semibold">
                              ${bar.usd.toFixed(2)}
                              {showBolivares && bar.ves > 0 && <span className="ml-1.5">Bs. {bar.ves.toFixed(2)}</span>}
                            </div>
                            {bar.orderCount > 0 && (
                              <div className="text-background/60 text-[9px] mt-0.5">
                                {bar.orderCount} pedido{bar.orderCount !== 1 ? "s" : ""}
                              </div>
                            )}
                          </div>
                          <div className="w-2 h-2 bg-foreground rotate-45 mx-auto -mt-1" />
                        </div>
                      )}

                      {/* Bar */}
                      <div
                        className={cn(
                          "w-full rounded-md transition-all duration-300 relative",
                          isHovered
                            ? "bg-primary"
                            : isToday
                              ? "bg-primary/70"
                              : "bg-primary/40 hover:bg-primary/60",
                        )}
                        style={{ height: `${Math.max(pct, 2)}%`, minHeight: bar.usd > 0 ? 4 : 2 }}
                      />

                      {/* Label */}
                      {showLabel && (
                        <span
                          className={cn(
                            "text-[8px] sm:text-[9px] font-semibold leading-none text-center whitespace-nowrap",
                            isHovered ? "text-foreground" : "text-muted-foreground",
                          )}
                          style={bars.length > 20 ? { writingMode: "vertical-rl", transform: "rotate(180deg)", height: 36 } : {}}
                        >
                          {bars.length > 20 ? bar.shortLabel : bar.shortLabel}
                        </span>
                      )}
                      {!showLabel && <span className="text-[8px]">&nbsp;</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SummaryCard({
  label,
  value,
  ves,
  showVes,
  count,
  accent,
}: {
  label: string
  value: number | null
  ves?: number
  showVes?: boolean
  count?: number
  accent?: boolean
}) {
  return (
    <div className={cn(
      "rounded-xl px-3 py-2.5 border transition-colors",
      accent ? "bg-primary/5 border-primary/15" : "bg-muted/30 border-border/40",
    )}>
      <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
      {value !== null ? (
        <>
          <p className={cn("text-base sm:text-lg font-black tabular-nums", accent ? "text-primary" : "text-foreground")}>
            ${value.toFixed(2)}
          </p>
          {showVes && ves !== undefined && ves > 0 && (
            <p className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold tabular-nums">
              Bs. {ves.toFixed(2)}
            </p>
          )}
        </>
      ) : (
        <p className={cn("text-base sm:text-lg font-black tabular-nums", accent ? "text-primary" : "text-foreground")}>
          {count ?? 0}
        </p>
      )}
    </div>
  )
}
