"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import { TrendingUp } from "lucide-react"
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

type Period = "day" | "week" | "month"

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

interface DataPoint {
  label: string
  shortLabel: string
  tooltipLabel: string
  usd: number
  ves: number
  orderCount: number
}

function computeData(
  period: Period,
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

const PAD_TOP = 20
const PAD_BOTTOM = 28
const PAD_LEFT = 44
const PAD_RIGHT = 16

const BRAND_BLUE = "#0066FF"

export function SalesChart({ orders, bcvRate }: Props) {
  const { rate, showBolivares } = useBcvRate()
  const [period, setPeriod] = useState<Period>("week")
  const [now, setNow] = useState(() => startOfDay(new Date()))
  const today = now
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { points, totalUsd, totalVes, subtitle, avgUsd, maxUsd } = useMemo(
    () => computeData(period, today, orders, rate),
    [period, today, orders, rate],
  )

  const handlePeriodChange = useCallback((p: Period) => {
    setPeriod(p)
    setNow(startOfDay(new Date()))
    setHoveredIdx(null)
  }, [])

  const activeRate = rate || bcvRate

  const chartW = Math.max(containerWidth - 2, 300)
  const plotW = chartW - PAD_LEFT - PAD_RIGHT
  const chartH = Math.max(220, Math.min(360, chartW * 0.45))
  const plotH = chartH - PAD_TOP - PAD_BOTTOM

  const { linePath, areaPath, dots, trendY } = useMemo(() => {
    if (points.length === 0 || plotW <= 0 || plotH <= 0) return { linePath: "", areaPath: "", dots: [], trendY: [] }

    const rawMax = maxUsd * 1.12 || 1
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)))
    const usableMax = Math.ceil(rawMax / magnitude) * magnitude || 1

    const getX = (i: number) => PAD_LEFT + (i / Math.max(points.length - 1, 1)) * plotW
    const getY = (v: number) => PAD_TOP + plotH - (v / usableMax) * plotH

    const pts = points.map((p, i) => ({ x: getX(i), y: getY(p.usd) }))

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

    const tickCount = 4
    const trendY = Array.from({ length: tickCount + 1 }, (_, i) => {
      const val = (usableMax / tickCount) * i
      return { val, y: getY(val) }
    })

    return { linePath, areaPath, dots: pts, trendY }
  }, [points, maxUsd, plotW, plotH])

  const effectiveRate = activeRate

  return (
    <div
      ref={containerRef}
      className="w-full rounded-2xl bg-white/70 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.04)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#0066FF]/10">
            <TrendingUp className="size-4 text-[#0066FF]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#050505]">Ventas</h3>
            <p className="text-[11px] text-[#6B7280] font-medium">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-[#F5F5F5] p-0.5">
          {([["day", "Día"], ["week", "Semana"], ["month", "Mes"]] as [Period, string][]).map(([p, label]) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={cn(
                "px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-200",
                period === p
                  ? "bg-white text-[#050505] shadow-sm"
                  : "text-[#6B7280] hover:text-[#050505]",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      {points.some((b) => b.usd > 0 || b.orderCount > 0) && (
        <div className="grid grid-cols-4 gap-2 px-5 pb-3">
          <div className="rounded-xl bg-gradient-to-br from-[#0066FF]/5 to-transparent border border-[#0066FF]/10 px-3 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-[#6B7280] mb-0.5">Total</p>
            <p className="text-sm font-bold text-[#0066FF] tabular-nums">${totalUsd.toFixed(2)}</p>
            {showBolivares && totalVes > 0 && (
              <p className="text-[10px] text-[#6B7280] font-medium tabular-nums">Bs. {totalVes.toFixed(2)}</p>
            )}
          </div>
          <div className="rounded-xl bg-[#F5F5F5]/50 border border-[#E5E7EB]/40 px-3 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-[#6B7280] mb-0.5">Promedio</p>
            <p className="text-sm font-bold text-[#050505] tabular-nums">${avgUsd.toFixed(2)}</p>
            {showBolivares && (
              <p className="text-[10px] text-[#6B7280] font-medium tabular-nums">Bs. {(avgUsd * effectiveRate).toFixed(2)}</p>
            )}
          </div>
          <div className="rounded-xl bg-[#F5F5F5]/50 border border-[#E5E7EB]/40 px-3 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-[#6B7280] mb-0.5">Máximo</p>
            <p className="text-sm font-bold text-[#050505] tabular-nums">${maxUsd.toFixed(2)}</p>
            {showBolivares && (
              <p className="text-[10px] text-[#6B7280] font-medium tabular-nums">Bs. {(maxUsd * effectiveRate).toFixed(2)}</p>
            )}
          </div>
          <div className="rounded-xl bg-[#F5F5F5]/50 border border-[#E5E7EB]/40 px-3 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-[#6B7280] mb-0.5">Pedidos</p>
            <p className="text-sm font-bold text-[#050505] tabular-nums">{points.reduce((s, b) => s + b.orderCount, 0)}</p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="px-4 pb-4">
        {points.length === 0 || points.every((b) => b.usd === 0 && b.orderCount === 0) ? (
          <div className="flex flex-col items-center gap-3 py-14">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#F5F5F5]">
              <TrendingUp className="size-5 text-[#6B7280]/40" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-[#050505]/70">Sin ventas</p>
              <p className="text-xs text-[#6B7280] mt-0.5">Las ventas aparecerán aquí cuando registres pedidos</p>
            </div>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${chartW} ${chartH}`}
            className="w-full"
            style={{ height: chartH }}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BRAND_BLUE} stopOpacity="0.14" />
                <stop offset="60%" stopColor={BRAND_BLUE} stopOpacity="0.05" />
                <stop offset="100%" stopColor={BRAND_BLUE} stopOpacity="0.005" />
              </linearGradient>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={BRAND_BLUE} stopOpacity="0.6" />
                <stop offset="50%" stopColor={BRAND_BLUE} stopOpacity="1" />
                <stop offset="100%" stopColor={BRAND_BLUE} stopOpacity="0.85" />
              </linearGradient>
              <filter id="lineGlow">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {trendY.map((t, i) => (
              <g key={i}>
                <line
                  x1={PAD_LEFT} y1={t.y} x2={chartW - PAD_RIGHT} y2={t.y}
                  stroke="#E5E7EB" strokeWidth="1"
                  strokeDasharray={i === 0 ? "0" : "3,3"}
                />
                <text x={PAD_LEFT - 8} y={t.y + 3.5} textAnchor="end" fill="#6B7280" fontSize="9" fontWeight="500">
                  {t.val >= 1000 ? `${(t.val / 1000).toFixed(1)}k` : t.val.toFixed(0)}
                </text>
              </g>
            ))}

            {dots.length > 1 && (
              <>
                <path d={areaPath} fill="url(#areaGrad)" />
                <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#lineGlow)" />
              </>
            )}

            {dots.map((dot, idx) => {
              const bar = points[idx]
              const isHovered = hoveredIdx === idx
              const isLast = idx === points.length - 1
              const boxW = plotW / points.length

              let tooltipX = dot.x
              let tooltipBoxX = dot.x - 72
              if (tooltipBoxX < PAD_LEFT) { tooltipBoxX = PAD_LEFT; tooltipX = PAD_LEFT + 72 }
              if (tooltipBoxX + 144 > chartW - PAD_RIGHT) { tooltipBoxX = chartW - PAD_RIGHT - 144; tooltipX = tooltipBoxX + 72 }

              let tooltipY = dot.y - 52
              let arrowDown = true
              if (tooltipY < 4) { tooltipY = dot.y + 14; arrowDown = false }

              return (
                <g key={idx}>
                  <rect
                    x={dot.x - boxW / 2}
                    y={PAD_TOP}
                    width={boxW}
                    height={plotH}
                    fill="transparent"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    style={{ cursor: "pointer" }}
                  />
                  {isHovered && (
                    <line x1={dot.x} y1={PAD_TOP} x2={dot.x} y2={PAD_TOP + plotH} stroke={BRAND_BLUE} strokeWidth="0.5" strokeDasharray="2,3" opacity="0.25" />
                  )}
                  <circle
                    cx={dot.x}
                    cy={dot.y}
                    r={isHovered ? 5 : isLast ? 4 : 2.5}
                    fill={isHovered ? BRAND_BLUE : "#ffffff"}
                    stroke={BRAND_BLUE}
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    className="transition-all duration-200"
                    style={{ filter: isHovered ? "drop-shadow(0 1px 4px rgba(0,102,255,0.3))" : "none" }}
                  />
                  {(points.length <= 12 || idx % Math.ceil(points.length / 10) === 0 || idx === points.length - 1) && (
                    <text
                      x={dot.x}
                      y={chartH - 6}
                      textAnchor="middle"
                      fill={isHovered ? BRAND_BLUE : "#6B7280"}
                      fontSize="9"
                      fontWeight={isHovered ? "600" : "500"}
                      className="transition-all duration-200"
                    >
                      {bar.shortLabel}
                    </text>
                  )}
                  {isHovered && (
                    <g>
                      <rect
                        x={tooltipBoxX}
                        y={tooltipY}
                        width={144}
                        height={44}
                        rx={8}
                        fill="#050505"
                        opacity="0.95"
                      />
                      <text x={tooltipX} y={tooltipY + 15} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="600">
                        {bar.tooltipLabel.length > 24 ? bar.tooltipLabel.slice(0, 24) + "…" : bar.tooltipLabel}
                      </text>
                      <text x={tooltipX} y={tooltipY + 29} textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="700">
                        ${bar.usd.toFixed(2)}
                        {showBolivares && bar.ves > 0 && (
                          <tspan fill="#9CA3AF" fontWeight="500"> · Bs. {bar.ves.toFixed(2)}</tspan>
                        )}
                      </text>
                      {bar.orderCount > 0 && (
                        <text x={tooltipX} y={tooltipY + 40} textAnchor="middle" fill="#9CA3AF" fontSize="8" fontWeight="500">
                          {bar.orderCount} pedido{bar.orderCount !== 1 ? "s" : ""}
                        </text>
                      )}
                      {arrowDown ? (
                        <polygon points={`${dot.x - 5},${tooltipY + 44} ${dot.x + 5},${tooltipY + 44} ${dot.x},${tooltipY + 50}`} fill="#050505" opacity="0.95" />
                      ) : (
                        <polygon points={`${dot.x - 5},${tooltipY} ${dot.x + 5},${tooltipY} ${dot.x},${tooltipY - 6}`} fill="#050505" opacity="0.95" />
                      )}
                    </g>
                  )}
                </g>
              )
            })}
          </svg>
        )}
      </div>
    </div>
  )
}