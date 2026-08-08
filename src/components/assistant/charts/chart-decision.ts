/**
 * Decisiones de gráficos conversacionales (FASE 5E).
 *
 * No se muestran gráficos cuando el volumen de datos no lo amerita: con menos
 * de `minPoints` puntos se prefiere una lista. También se limita la cantidad de
 * puntos para no renderizar gráficos ilegibles.
 */

export interface ChartDatum {
  label: string
  value: number
  color?: string
}

export interface ChartBlockLike {
  type: "bar" | "line" | "donut" | "sparkline"
  data: ChartDatum[]
  minPoints?: number
}

export const DEFAULT_MIN_POINTS = 2
export const MAX_CHART_POINTS = 60
export const MAX_BAR_LABELS = 12

/** Mínimo de puntos que exige este bloque. */
export function minPointsFor(block: ChartBlockLike): number {
  return block.minPoints ?? DEFAULT_MIN_POINTS
}

/** true si el gráfico se debe dibujar (suficiente volumen de datos). */
export function shouldRenderChart(block: ChartBlockLike): boolean {
  return block.data.length >= minPointsFor(block)
}

/** Recorta/muestrea la serie para no dibujar demasiados puntos. */
export function capChartData(data: ChartDatum[], max = MAX_CHART_POINTS): ChartDatum[] {
  if (data.length <= max) return data
  const step = data.length / max
  const sampled: ChartDatum[] = []
  for (let i = 0; i < max; i++) {
    const idx = Math.min(data.length - 1, Math.floor(i * step))
    sampled.push(data[idx])
  }
  return sampled
}

export interface ChartScale {
  max: number
  /** Máximo "bonito" (redondeado hacia arriba) para ejes. */
  niceMax: number
}

/** Escala vertical/radial de una serie de valores. */
export function chartScale(values: number[]): ChartScale {
  const rawMax = values.length > 0 ? Math.max(0, ...values) : 0
  if (rawMax <= 0) return { max: 0, niceMax: 1 }
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)))
  const niceMax = Math.ceil(rawMax / magnitude) * magnitude
  return { max: rawMax, niceMax: niceMax || 1 }
}

/** Formatea un valor de gráfico según el tipo de dato. */
export function formatChartValue(value: number, currency?: boolean, percent?: boolean): string {
  if (percent) return `${Math.round(value)}%`
  if (currency) return `$${Number(value).toLocaleString("es-VE", { maximumFractionDigits: 0 })}`
  return Number(value).toLocaleString("es-VE", { maximumFractionDigits: 0 })
}

export interface DonutSegments {
  /** Proporción de cada segmento en % del círculo (100 total). */
  segments: number[]
  /** Colores por segmento (hex). */
  palette: string[]
}

const DONUT_PALETTE = ["#8b5cf6", "#06b6d4", "#f59e0b", "#10b981", "#ef4444", "#6366f1", "#ec4899", "#84cc16"]

/** Calcula los segmentos de un donut (proporciones) y su paleta. */
export function donutSegments(data: ChartDatum[]): DonutSegments {
  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0)
  if (total <= 0) return { segments: [], palette: [] }
  return {
    segments: data.map((d, i) => {
      const pct = (Math.max(0, d.value) / total) * 100
      return i === data.length - 1 ? Math.max(0, 100 - data.slice(0, -1).reduce((s, d2) => s + (Math.max(0, d2.value) / total) * 100, 0)) : pct
    }),
    palette: data.map((d, i) => d.color ?? DONUT_PALETTE[i % DONUT_PALETTE.length]),
  }
}
