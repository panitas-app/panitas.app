"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PROSPECT_STATUSES, getStatusInfo } from "@/lib/crm/constants"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  BarChart3,
  TrendingUp,
  MapPin,
  LayoutList,
  Users,
} from "lucide-react"

interface Stats {
  totalProspects: number
  newThisMonth: number
  visitsToday: number
  pendingFollowUps: number
  converted: number
  lost: number
  monthlyConversion: number
  yearlyConversion: number
  funnel: { status: string; count: number }[]
}

interface Prospect {
  ciudad: string | null
  categoria: string
  estadoProspecto: string
}

export default function ReportesPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/prospects/stats").then((r) => r.json()),
      fetch("/api/admin/prospects?limit=1000").then((r) => r.json()),
    ])
      .then(([statsData, prospectsData]) => {
        setStats(statsData)
        setProspects(prospectsData.data || [])
        setLoading(false)
      })
      .catch(() => {
        toast.error("Error al cargar reportes")
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        Cargando...
      </div>
    )
  }

  const cityCounts: Record<string, number> = {}
  const catCounts: Record<string, number> = {}

  for (const p of prospects) {
    const city = p.ciudad || "Sin ciudad"
    cityCounts[city] = (cityCounts[city] || 0) + 1
    catCounts[p.categoria] = (catCounts[p.categoria] || 0) + 1
  }

  const sortedCities = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const sortedCats = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const maxCity = Math.max(...sortedCities.map(([, c]) => c), 1)
  const maxCat = Math.max(...sortedCats.map(([, c]) => c), 1)

  const funnel = stats?.funnel || []
  const totalFunnel = funnel.reduce((sum, f) => sum + f.count, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reportes</h1>
        <p className="text-sm text-muted-foreground">Analisis del embudo de ventas</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card size="sm">
            <CardContent className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Users className="size-5 text-primary/60" />
              </div>
              <div>
                <p className="text-2xl font-heading font-bold">{stats.totalProspects}</p>
                <p className="text-xs text-muted-foreground">Total prospectos</p>
              </div>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10">
                <TrendingUp className="size-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-heading font-bold">{stats.converted}</p>
                <p className="text-xs text-muted-foreground">Ganados</p>
              </div>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
                <TrendingUp className="size-5 text-red-500 rotate-180" />
              </div>
              <div>
                <p className="text-2xl font-heading font-bold">{stats.lost}</p>
                <p className="text-xs text-muted-foreground">Perdidos</p>
              </div>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
                <BarChart3 className="size-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-heading font-bold">{stats.monthlyConversion}%</p>
                <p className="text-xs text-muted-foreground">Conversion mensual</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="size-4" />
            Embudo de Conversion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {funnel.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
          ) : (
            PROSPECT_STATUSES.map((s) => {
              const item = funnel.find((f) => f.status === s.value)
              const count = item?.count || 0
              if (count === 0) return null
              const pct = totalFunnel > 0 ? Math.round((count / totalFunnel) * 100) : 0
              return (
                <div key={s.value} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{s.label}</span>
                    <span className="text-muted-foreground">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="bg-muted rounded-full h-6 overflow-hidden">
                    <div
                      className={cn("h-6 rounded-full transition-all", s.color)}
                      style={{ width: `${Math.max(pct, count > 0 ? 5 : 0)}%` }}
                    />
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="size-4" />
              Prospectos por Ciudad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedCities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
            ) : (
              sortedCities.map(([city, count]) => (
                <div key={city} className="flex items-center gap-2">
                  <span className="text-xs w-28 text-right text-muted-foreground truncate shrink-0">
                    {city}
                  </span>
                  <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                    <div
                      className="bg-primary/70 h-6 rounded-full transition-all"
                      style={{ width: `${(count / maxCity) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono w-8 text-right shrink-0">{count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <LayoutList className="size-4" />
              Prospectos por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedCats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
            ) : (
              sortedCats.map(([cat, count]) => (
                <div key={cat} className="flex items-center gap-2">
                  <span className="text-xs w-28 text-right text-muted-foreground truncate shrink-0">
                    {cat}
                  </span>
                  <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                    <div
                      className="bg-primary/70 h-6 rounded-full transition-all"
                      style={{ width: `${(count / maxCat) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono w-8 text-right shrink-0">{count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
