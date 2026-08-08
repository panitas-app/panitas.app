"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ChartBlock } from "@/lib/conversational-actions"
import { iconByName } from "@/components/assistant/renderers/icons"
import { capChartData, chartScale, donutSegments, formatChartValue, shouldRenderChart } from "@/components/assistant/charts/chart-decision"

/** Vista previa o gráfico completo según el volumen de datos (FASE 5E). */
export function RichChart({ block }: { block: ChartBlock }) {
  const Icon = block.icon ? iconByName(block.icon) : null

  if (!shouldRenderChart(block)) {
    return (
      <Card className="rounded-2xl border bg-card/60">
        <CardHeader className="px-4 py-3">
          <div className="flex items-center gap-2">
            {Icon ? <Icon className="size-4 text-muted-foreground" aria-hidden /> : null}
            <CardTitle className="text-sm font-semibold">{block.title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3 pt-0">
          <p className="text-xs text-muted-foreground">
            Hay pocos datos para un gráfico todavía:{" "}
            <span className="font-medium text-foreground">{block.data.length} punto(s)</span>. Revisa la tabla para ver el detalle.
          </p>
        </CardContent>
      </Card>
    )
  }

  const data = capChartData(block.data)
  const scale = chartScale(data.map((d) => d.value))
  const { segments, palette } = donutSegments(data)

  return (
    <Card className="rounded-2xl border bg-card/60" data-slot="assistant-chart" data-chart-type={block.type}>
      <CardHeader className="px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {Icon ? <Icon className="size-4 text-muted-foreground" aria-hidden /> : null}
            <CardTitle className="text-sm font-semibold">{block.title}</CardTitle>
            {block.badge ? <Badge variant="secondary">{block.badge}</Badge> : null}
          </div>
          {block.unit ? <span className="text-xs text-muted-foreground">{block.unit}</span> : null}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        {block.type === "donut" ? <DonutChart data={data} segments={segments} palette={palette} /> : null}
        {block.type === "bar" ? <BarChart data={data} scale={scale.niceMax} currency={block.currency} percent={block.percent} /> : null}
        {block.type === "sparkline" ? <Sparkline data={data} scale={scale.niceMax} currency={block.currency} percent={block.percent} /> : null}
        {block.type === "line" ? <LineChart data={data} scale={scale.niceMax} currency={block.currency} percent={block.percent} /> : null}
      </CardContent>
    </Card>
  )
}

function BarChart({ data, scale, currency, percent }: { data: Array<{ label: string; value: number }>; scale: number; currency?: boolean; percent?: boolean }) {
  return (
    <div className="flex h-40 w-full items-end gap-1.5 overflow-x-auto pb-1" role="img" aria-label={`Gráfico de barras: ${data.map((d) => `${d.label}: ${formatChartValue(d.value, currency, percent)}`).join(", ")}`}>
      {data.map((point, i) => {
        const height = scale === 0 ? 4 : Math.max(4, (point.value / scale) * 100)
        return (
          <div key={i} className="group flex h-full min-w-6 flex-1 flex-col items-center justify-end gap-1" title={`${point.label}: ${formatChartValue(point.value, currency, percent)}`}>
            <span className="text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
              {formatChartValue(point.value, currency, percent)}
            </span>
            <div className="w-full rounded-t-md bg-primary/80 transition-colors group-hover:bg-primary" style={{ height: `${height}%` }} />
            <span className="w-full truncate text-center text-[10px] text-muted-foreground">{point.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function DonutChart({ data, segments, palette }: { data: Array<{ label: string; value: number }>; segments: number[]; palette: string[] }) {
  const total = data.reduce((acc, d) => acc + d.value, 0) || 1
  let offset = 0
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative size-32 shrink-0">
        <svg viewBox="0 0 42 42" className="size-full -rotate-90" role="img" aria-label="Gráfico de dona">
          <circle cx="21" cy="21" r="15.915" fill="none" strokeWidth="6" className="stroke-muted" />
          {segments.map((seg, i) => {
            const circle = (
              <circle key={i} cx="21" cy="21" r="15.915" fill="none" stroke={palette[i]} strokeWidth="6" strokeDasharray={`${Math.max(0.5, seg)} ${100 - Math.max(0.5, seg)}`} strokeDashoffset={offset} strokeLinecap="round" />
            )
            offset -= seg
            return circle
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-foreground">{data.length}</span>
          <span className="text-[10px] text-muted-foreground">segmentos</span>
        </div>
      </div>
      <ul className="w-full space-y-1.5">
        {data.map((point, i) => (
          <li key={i} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: palette[i] }} aria-hidden />
              <span className="truncate text-muted-foreground">{point.label}</span>
            </span>
            <span className="font-medium text-foreground">{Math.round((point.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Sparkline({ data, scale, currency, percent }: { data: Array<{ label: string; value: number }>; scale: number; currency?: boolean; percent?: boolean }) {
  const width = 320
  const height = 48
  const max = Math.max(1, scale)
  const min = Math.min(0, ...data.map((d) => d.value))
  const points = data
    .map((d, i) => `${(i / Math.max(1, data.length - 1)) * width},${height - ((d.value - min) / (max - min || 1)) * (height - 4) - 2}`)
    .join(" ")
  const last = data[data.length - 1]
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-12 w-full" role="img" aria-label={`Tendencia: ${data.map((d) => `${d.label} ${formatChartValue(d.value, currency, percent)}`).join(", ")}`}>
        <polyline points={points} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stroke-primary" />
      </svg>
      {last ? (
        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>{data[0].label}</span>
          <span className="font-semibold text-foreground">{formatChartValue(last.value, currency, percent)}</span>
          <span>{last.label}</span>
        </div>
      ) : null}
    </div>
  )
}

function LineChart({ data, scale, currency, percent }: { data: Array<{ label: string; value: number }>; scale: number; currency?: boolean; percent?: boolean }) {
  const width = 320
  const height = 96
  const max = Math.max(1, scale)
  const min = Math.min(0, ...data.map((d) => d.value))
  const step = data.length > 1 ? width / (data.length - 1) : width
  const points = data
    .map((d, i) => `${i * step},${height - ((d.value - min) / (max - min || 1)) * (height - 8) - 4}`)
    .join(" ")
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-24 w-full" role="img" aria-label={`Gráfico de línea: ${data.map((d) => `${d.label} ${formatChartValue(d.value, currency, percent)}`).join(", ")}`}>
        <polyline points={points} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stroke-primary" />
        {data.map((d, i) => (
          <circle key={i} cx={i * step} cy={height - ((d.value - min) / (max - min || 1)) * (height - 8) - 4} r="2.5" className="fill-primary" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{data[0]?.label}</span>
        <span>{data[Math.floor(data.length / 2)]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  )
}

export { RichChart as SimpleChart }
