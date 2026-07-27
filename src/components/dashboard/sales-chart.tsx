"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { CalendarDays, TrendingUp } from "lucide-react"
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

interface DataPoint {
  label: string
  shortLabel: string
  tooltipLabel: string
  usd: number
  ves: number
  orderCount: number
}

function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number } {
  const n = points.length
  if (n < 2) return { slope: 0, intercept: points[0]?.y ?? 0 }
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
  for (const p of points) {
    sumX += p.x; sumY += p.y; sumXY += p.x * p.y; sumX2 += p.x * p.x
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

function computeData(
  period: Period,
  customStart: Date,
  customEnd: Date,
  today: Date,
  orders: OrderData[],
  bcvRate: number,
): { points: DataPoint[]; totalUsd: number; totalVes: number; subtitle: string; avgUsd: number; maxUsd: number } {
  const toVes = (o: OrderData) => o.total * (o.bcvRateAtOrder || bcvRate)

  function aggregate(filtered: OrderData[]): { usd: number; ves: number } {
    let usd = 0, ves = 0
    for (const o of filtered) { usd += o.total; ves += toVes(o) }
    return { usd, ves }
  }

  if (period === "day") {
    const daysCount = 7
    const points: DataPoint[] = []
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
      points.push({
        label: `${WEEKDAYS[day.getDay()]} ${day.getDate()}`,
        shortLabel: `${day.getDate()}`,
        tooltipLabel: `${WEEKDAYS[day.getDay()]} ${day.getDate()} ${MONTHS[day.getMonth()]}${isToday ? " (Hoy)" : ""}`,
        usd, ves, orderCount: filtered.length,
      })
    }
    const nonZero = points.filter((b) => b.usd > 0)
    return {
      points, totalUsd, totalVes, subtitle,
      avgUsd: nonZero.length > 0 ? totalUsd / nonZero.length : 0,
      maxUsd: Math.max(...points.map((b) => b.usd), 1),
    }
  }

  if (period === "week") {
    const weeksCount = 8
    const thisWeekStart = startOfWeek(today)
    const earliest = new Date(thisWeekStart)
    earliest.setDate(earliest.getDate() - (weeksCount - 1) * 7)
    const points: DataPoint[] = []
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
      points.push({
        label: `${fmtShortDate(ws)} - ${fmtShortDate(we)}`,
        shortLabel: `${ws.getDate()}/${ws.getMonth() + 1}`,
        tooltipLabel: `${fmtShortDate(ws)} – ${fmtShortDate(we)}`,
        usd, ves, orderCount: filtered.length,
      })
    }
    const nonZero = points.filter((b) => b.usd > 0)
    return {
      points, totalUsd, totalVes,
      subtitle: `Últimas ${weeksCount} semanas`,
      avgUsd: nonZero.length > 0 ? totalUsd / nonZero.length : 0,
      maxUsd: Math.max(...points.map((b) => b.usd), 1),
    }
  }

  if (period === "month") {
    const monthsCount = 12
    const points: DataPoint[] = []
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
      points.push({
        label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
        shortLabel: `${MONTHS[d.getMonth()]}`,
        tooltipLabel: `${MONTHS[d.getMonth()]} ${d.getFullYear()}${isCurrentMonth ? " (Actual)" : ""}`,
        usd, ves, orderCount: filtered.length,
      })
    }
    const subtitle = `${MONTHS[new Date(today.getFullYear(), today.getMonth() - monthsCount + 1, 1).getMonth()]} ${new Date(today.getFullYear(), today.getMonth() - monthsCount + 1, 1).getFullYear()} – ${MONTHS[today.getMonth()]} ${today.getFullYear()}`
    const nonZero = points.filter((b) => b.usd > 0)
    return {
      points, totalUsd, totalVes, subtitle,
      avgUsd: nonZero.length > 0 ? totalUsd / nonZero.length : 0,
      maxUsd: Math.max(...points.map((b) => b.usd), 1),
    }
  }

  // custom range
  if (customStart > customEnd) {
    return { points: [], totalUsd: 0, totalVes: 0, subtitle: "Rango inválido", avgUsd: 0, maxUsd: 1 }
  }

  const rangeDays = Math.floor((customEnd.getTime() - customStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const subtitle = `${fmtShortDate(customStart)} – ${fmtShortDate(customEnd)}`
  const points: DataPoint[] = []
  let totalUsd = 0, totalVes = 0

  if (rangeDays <= 60) {
    const cursor = new Date(customStart)
    while (cursor <= customEnd) {
      const day = new Date(cursor)
      const filtered = orders.filter((o) => isSameDay(new Date(o.createdAt), day))
      const { usd, ves } = aggregate(filtered)
      totalUsd += usd; totalVes += ves
      points.push({
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
      points.push({
        label: `${fmtShortDate(ws)} - ${fmtShortDate(we)}`,
        shortLabel: `${ws.getDate()}/${ws.getMonth() + 1}`,
        tooltipLabel: `${fmtShortDate(ws)} – ${fmtShortDate(we)}`,
        usd, ves, orderCount: filtered.length,
      })
    }
  }

  const nonZero = points.filter((b) => b.usd > 0)
  return {
    points, totalUsd, totalVes, subtitle,
    avgUsd: nonZero.length > 0 ? totalUsd / nonZero.length : 0,
    maxUsd: Math.max(...points.map((b) => b.usd), 1),
  }
}

const CHART_H = 200
const PAD_TOP = 24
const PAD_BOTTOM = 28
const PAD_LEFT = 48
const PAD_RIGHT = 16

export function SalesChart({ orders, bcvRate }: Props) {
  const { rate, showBolivares } = useBcvRate()
  const [period, setPeriod] = useState<Period>("week")
  const [now, setNow] = useState(() => startOfDay(new Date()))
  const today = now
  const svgRef = useRef<SVGSVGElement>(null)

  const [customStart, setCustomStart] = useState<Date>(() => {
    const d = new Date(today)
    d.setDate(d.getDate() - 30)
    return startOfDay(d)
  })
  const [customEnd, setCustomEnd] = useState<Date>(today)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const { points, totalUsd, totalVes, subtitle, avgUsd, maxUsd } = useMemo(
    () => computeData(period, customStart, customEnd, today, orders, rate),
    [period, customStart, customEnd, today, orders, rate],
  )

  const handlePeriodChange = useCallback((p: Period) => {
    setPeriod(p)
    setNow(startOfDay(new Date()))
  }, [])

  const activeRate = rate || bcvRate

  const chartW = Math.max(points.length * 60, 300)
  const plotW = chartW - PAD_LEFT - PAD_RIGHT
  const plotH = CHART_H - PAD_TOP - PAD_BOTTOM

  const { linePath, areaPath, trendPath, dots, trendY } = useMemo(() => {
    if (points.length === 0) return { linePath: "", areaPath: "", trendPath: "", dots: [], trendY: [] }

    const usableMax = maxUsd * 1.1 || 1

    const getX = (i: number) => PAD_LEFT + (i / (points.length - 1 || 1)) * plotW
    const getY = (v: number) => PAD_TOP + plotH - (v / usableMax) * plotH

    const pts = points.map((p, i) => ({ x: getX(i), y: getY(p.usd) }))

    // Smooth line via catmull-rom to bezier
    let linePath = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)]
      const p1 = pts[i]
      const p2 = pts[i + 1]
      const p3 = pts[Math.min(i + 2, pts.length - 1)]
      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6
      linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
    }

    const areaPath = linePath + ` L ${pts[pts.length - 1].x} ${PAD_TOP + plotH} L ${pts[0].x} ${PAD_TOP + plotH} Z`

    // Trend line
    const regPoints = points.map((p, i) => ({ x: i, y: p.usd }))
    const { slope, intercept } = linearRegression(regPoints)
    const trendStart = intercept
    const trendEnd = slope * (points.length - 1) + intercept
    const trendPath = `M ${getX(0)} ${getY(trendStart)} L ${getX(points.length - 1)} ${getY(trendEnd)}`

    // Y-axis ticks
    const tickCount = 4
    const trendY = Array.from({ length: tickCount + 1 }, (_, i) => {
      const val = (usableMax / tickCount) * i
      return { val, y: getY(val) }
    })

    return { linePath, areaPath, trendPath, dots: pts, trendY }
  }, [points, maxUsd, plotW, plotH])

  return (
    <Card className="rounded-2xl bg-card shadow-xs overflow-hidden border border-border/50">
      <CardContent className="p-4 sm:p-6">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="size-4 text-primary" />
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
              <input type="date" value={fmtInput(customStart)} max={fmtInput(customEnd)}
                onChange={(e) => { const d = parseInput(e.target.value); if (d) setCustomStart(startOfDay(d)) }}
                className="h-8 rounded-lg border border-input bg-background px-2 text-xs text-foreground" />
            </label>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              Hasta
              <input type="date" value={fmtInput(customEnd)} min={fmtInput(customStart)} max={fmtInput(today)}
                onChange={(e) => { const d = parseInput(e.target.value); if (d) setCustomEnd(startOfDay(d)) }}
                className="h-8 rounded-lg border border-input bg-background px-2 text-xs text-foreground" />
            </label>
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <SummaryCard label="Total" value={totalUsd} ves={totalVes} showVes={showBolivares} accent />
          <SummaryCard label="Promedio" value={avgUsd} ves={avgUsd * activeRate} showVes={showBolivares} />
          <SummaryCard label="Máximo" value={maxUsd} ves={maxUsd * activeRate} showVes={showBolivares} />
          <SummaryCard label="Pedidos" value={null} count={points.reduce((s, b) => s + b.orderCount, 0)} />
        </div>

        {/* Chart */}
        {points.length === 0 || points.every((b) => b.usd === 0 && b.orderCount === 0) ? (
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
              <svg
                ref={svgRef}
                viewBox={`0 0 ${chartW} ${CHART_H}`}
                className="w-full"
                style={{ minWidth: chartW, height: CHART_H }}
              >
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
                  </linearGradient>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
                    <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="1" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
                  </linearGradient>
                </defs>

                {/* Y-axis grid + labels */}
                {trendY.map((t, i) => (
                  <g key={i}>
                    <line x1={PAD_LEFT} y1={t.y} x2={chartW - PAD_RIGHT} y2={t.y} stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray={i === 0 ? "0" : "4,4"} />
                    <text x={PAD_LEFT - 6} y={t.y + 3} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize="9" fontWeight="600">
                      ${t.val >= 1000 ? `${(t.val / 1000).toFixed(1)}k` : t.val.toFixed(0)}
                    </text>
                  </g>
                ))}

                {/* Area fill */}
                <path d={areaPath} fill="url(#areaGrad)" />

                {/* Main line */}
                <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Trend line */}
                <path d={trendPath} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1" strokeDasharray="6,4" opacity="0.5" />

                {/* Data dots + hover targets */}
                {dots.map((dot, idx) => {
                  const bar = points[idx]
                  const isHovered = hoveredIdx === idx
                  const isLast = idx === points.length - 1

                  return (
                    <g key={idx}>
                      {/* Invisible wider hover target */}
                      <rect
                        x={dot.x - plotW / points.length / 2}
                        y={PAD_TOP}
                        width={plotW / points.length}
                        height={plotH}
                        fill="transparent"
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                        style={{ cursor: "pointer" }}
                      />
                      {/* Vertical hover line */}
                      {isHovered && (
                        <line x1={dot.x} y1={PAD_TOP} x2={dot.x} y2={PAD_TOP + plotH} stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.5" />
                      )}
                      {/* Dot */}
                      <circle
                        cx={dot.x}
                        cy={dot.y}
                        r={isHovered ? 5 : isLast ? 4 : 3}
                        fill={isHovered ? "hsl(var(--primary))" : isLast ? "hsl(var(--primary))" : "hsl(var(--background))"}
                        stroke="hsl(var(--primary))"
                        strokeWidth={isHovered ? 2 : isLast ? 2 : 1.5}
                        className="transition-all duration-200"
                      />
                      {/* X-axis label (show every N) */}
                      {(points.length <= 14 || idx % Math.ceil(points.length / 10) === 0 || idx === points.length - 1) && (
                        <text
                          x={dot.x}
                          y={CHART_H - 4}
                          textAnchor="middle"
                          fill={isHovered ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))"}
                          fontSize="9"
                          fontWeight={isHovered ? "700" : "600"}
                          className="transition-all duration-200"
                        >
                          {bar.shortLabel}
                        </text>
                      )}
                      {/* Tooltip */}
                      {isHovered && (
                        <g>
                          <rect
                            x={dot.x - 70}
                            y={dot.y - 52}
                            width={140}
                            height={44}
                            rx={8}
                            fill="hsl(var(--foreground))"
                            opacity="0.95"
                          />
                          <text x={dot.x} y={dot.y - 36} textAnchor="middle" fill="hsl(var(--background))" fontSize="9" fontWeight="700">
                            {bar.tooltipLabel.length > 22 ? bar.tooltipLabel.slice(0, 22) + "…" : bar.tooltipLabel}
                          </text>
                          <text x={dot.x} y={dot.y - 22} textAnchor="middle" fill="hsl(var(--background))" fontSize="9" fontWeight="600" opacity="0.8">
                            ${bar.usd.toFixed(2)}{showBolivares && bar.ves > 0 ? ` · Bs. ${bar.ves.toFixed(2)}` : ""}
                          </text>
                          {bar.orderCount > 0 && (
                            <text x={dot.x} y={dot.y - 10} textAnchor="middle" fill="hsl(var(--background))" fontSize="8" opacity="0.6">
                              {bar.orderCount} pedido{bar.orderCount !== 1 ? "s" : ""}
                            </text>
                          )}
                          <polygon
                            points={`${dot.x - 5},${dot.y - 8} ${dot.x + 5},${dot.y - 8} ${dot.x},${dot.y - 2}`}
                            fill="hsl(var(--foreground))"
                            opacity="0.95"
                          />
                        </g>
                      )}
                    </g>
                  )
                })}
              </svg>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SummaryCard({
  label, value, ves, showVes, count, accent,
}: {
  label: string; value: number | null; ves?: number; showVes?: boolean; count?: number; accent?: boolean
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
