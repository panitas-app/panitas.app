"use client"

import { useState, useEffect, useCallback } from "react"
import { Target, TrendingUp, TrendingDown, DollarSign, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface BreakevenData {
  puntoEquilibrio: number
  ventasMes: number
  balance: number
  porcentaje: number
  gastosTotales: number
  gastosFijos: number
  categorias: { name: string; amount: number }[]
  month: number
  year: number
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

const CATEGORY_LABELS: Record<string, string> = {
  alquiler: "Alquiler",
  nomina: "Nómina",
  servicios: "Servicios",
  suscripciones: "Suscripciones",
  impuestos: "Impuestos",
  mantenimiento: "Mantenimiento",
  tecnologia: "Tecnología",
  marketing: "Marketing",
  seguros: "Seguros",
  transporte: "Transporte",
  legal: "Legal",
  publicidad: "Publicidad",
  comisiones: "Comisiones",
  suministros: "Suministros",
  alimentacion: "Alimentación",
  educacion: "Educación",
  salud: "Salud",
  inventario: "Inventario",
  envio: "Envío",
  empaque: "Empaque",
  otros: "Otros",
}

const CATEGORY_COLORS: Record<string, string> = {
  alquiler: "#ef4444",
  nomina: "#f59e0b",
  servicios: "#3b82f6",
  suscripciones: "#8b5cf6",
  impuestos: "#ef4444",
  mantenimiento: "#06b6d4",
  tecnologia: "#6366f1",
  marketing: "#10b981",
  seguros: "#f97316",
  transporte: "#84cc16",
  legal: "#64748b",
  publicidad: "#ec4899",
  comisiones: "#14b8a6",
  suministros: "#78716c",
  alimentacion: "#eab308",
  educacion: "#22d3ee",
  salud: "#a855f7",
  inventario: "#f43f5e",
  envio: "#06b6d4",
  empaque: "#a16207",
  otros: "#6b7280",
}

function getMonthDate(month: number, year: number) {
  return new Date(year, month - 1, 1)
}

export default function PuntoEquilibrioTab() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [data, setData] = useState<BreakevenData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/analytics/breakeven?month=${month}&year=${year}`)
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || "Error al cargar")
        return
      }
      const json = await res.json()
      setData(json)
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => { fetchData() }, [fetchData])

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1) }
    else setMonth(month - 1)
  }

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1) }
    else setMonth(month + 1)
  }

  const currentMonth = getMonthDate(month, year)
  const isCurrentOrPast = currentMonth <= new Date()
  const isBreakEven = data && data.porcentaje >= 100
  const isClose = data && data.porcentaje >= 80 && data.porcentaje < 100

  return (
    <div className="space-y-6">
      {/* Header con selector de mes */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold text-[#050505] flex items-center gap-2">
          <Target className="size-5 text-primary" />
          Punto de Equilibrio
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronLeft className="size-4 text-muted-foreground" />
          </button>
          <span className="text-sm font-medium text-foreground min-w-36 text-center">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            onClick={nextMonth}
            disabled={!isCurrentOrPast}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
          >
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-card flex items-center gap-2 p-4 text-sm text-destructive rounded-2xl border border-destructive/15">
          <AlertCircle className="size-4 shrink-0" /> {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && data && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="glass-card rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="size-3.5" />
                  Punto de Equilibrio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-foreground">
                  ${data.puntoEquilibrio.toFixed(2)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Gastos fijos del mes
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="size-3.5" />
                  Ventas del mes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-foreground">
                  ${data.ventasMes.toFixed(2)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {data.porcentaje}% del equilibrio
                </p>
              </CardContent>
            </Card>

            <Card className={`glass-card rounded-2xl ${data.balance >= 0 ? "border-emerald-200/50" : "border-red-200/50"}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  {data.balance >= 0 ? <TrendingUp className="size-3.5 text-emerald-500" /> : <TrendingDown className="size-3.5 text-red-500" />}
                  Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-black ${data.balance >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {data.balance >= 0 ? "+" : ""}{data.balance.toFixed(2)} USD
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {data.balance >= 0 ? "Por encima del equilibrio" : "Por debajo del equilibrio"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Progress bar */}
          <Card className="glass-card rounded-2xl p-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Progreso hacia el punto de equilibrio</span>
                <span className={`font-bold ${data.porcentaje >= 100 ? "text-emerald-500" : "text-red-500"}`}>
                  {data.porcentaje}%
                </span>
              </div>

              <div className="relative h-6 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${
                    data.porcentaje >= 100
                      ? "bg-emerald-500"
                      : data.porcentaje >= 80
                      ? "bg-amber-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(data.porcentaje, 100)}%` }}
                />
                {/* Break-even line */}
                <div className="absolute inset-y-0 left-0 w-0.5 bg-foreground/30" style={{ left: "100%" }} />
              </div>

              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>$0</span>
                <span className={`font-semibold ${data.balance >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  Punto de equilibrio: ${data.puntoEquilibrio.toFixed(2)}
                </span>
                <span>${(data.puntoEquilibrio * 1.5).toFixed(0)}+</span>
              </div>

              {/* Status badge */}
              <div className="flex justify-center pt-1">
                <Badge
                  className={`text-xs px-3 py-1 rounded-full ${
                    isBreakEven
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : isClose
                      ? "bg-amber-100 text-amber-700 border-amber-200"
                      : "bg-red-100 text-red-700 border-red-200"
                  }`}
                >
                  {isBreakEven
                    ? "Punto de equilibrio alcanzado"
                    : isClose
                    ? "Cerca del equilibrio"
                    : "Por debajo del equilibrio"}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Desglose por categoria */}
          {data.categorias.length > 0 && (
            <Card className="glass-card rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Desglose de gastos fijos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.categorias.map((cat) => {
                  const pct = data.puntoEquilibrio > 0 ? (cat.amount / data.puntoEquilibrio) * 100 : 0
                  const color = CATEGORY_COLORS[cat.name] || "#6b7280"
                  return (
                    <div key={cat.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">
                          {CATEGORY_LABELS[cat.name] || cat.name}
                        </span>
                        <span className="text-muted-foreground">
                          ${cat.amount.toFixed(2)} <span className="text-[11px]">({Math.round(pct)}%)</span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Empty state: no fixed expenses */}
          {data.categorias.length === 0 && (
            <Card className="glass-card rounded-2xl p-8 text-center">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted/50">
                <Target className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No hay gastos fijos registrados para {MONTH_NAMES[month - 1]} {year}.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Ve a la pestaña <strong>Gastos</strong> y marca tus gastos como <strong>Recurrente</strong> para que aparezcan aquí.
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
