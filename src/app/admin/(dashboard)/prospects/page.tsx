"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ProspectStatsCards } from "@/components/admin/prospects/prospect-stats-cards"
import { PROSPECT_STATUSES, getStatusInfo } from "@/lib/crm/constants"
import { cn } from "@/lib/utils"
import {
  BarChart3,
  Phone,
  MessageCircle,
  ClipboardCheck,
  Users,
  TrendingUp,
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
  todayContacts: number
}

interface TodayContact {
  id: string
  nombreNegocio: string
  propietario: string
  categoria: string
  estadoProspecto: string
  whatsapp: string | null
  telefono: string | null
}

export default function ProspectsDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [todayProspects, setTodayProspects] = useState<TodayContact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/prospects/stats").then((r) => r.json()),
      fetch("/api/admin/prospects?limit=100").then((r) => r.json()),
    ])
      .then(([statsData, prospectsData]) => {
        setStats(statsData)
        const today = new Date().toISOString().split("T")[0]
        setTodayProspects(
          (prospectsData.data || []).filter(
            (p: any) =>
              p.reminders?.some((r: any) => r.fecha?.startsWith(today) && !r.completado) ||
              p.activities?.some((a: any) => a.fecha?.startsWith(today))
          )
        )
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Cargando...</div>
  }

  const funnel = stats?.funnel || []
  const maxCount = Math.max(...funnel.map((f) => f.count), 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clientes Potenciales</h1>
        <p className="text-sm text-muted-foreground">CRM comercial de Panitas</p>
      </div>

      {stats && <ProspectStatsCards stats={stats} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="size-4" />
            Embudo de Ventas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {funnel.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
          ) : (
            PROSPECT_STATUSES.map((s) => {
              const item = funnel.find((f) => f.status === s.value)
              const count = item?.count || 0
              const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
              if (!item && count === 0) return null
              return (
                <div key={s.value} className="flex items-center gap-3">
                  <span className="text-xs w-28 text-right text-muted-foreground shrink-0">
                    {s.label}
                  </span>
                  <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                    <div
                      className={cn("h-6 rounded-full transition-all", s.color)}
                      style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono w-8 text-right shrink-0">{count}</span>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="size-4" />
            Contactos de Hoy
          </h2>
          <Badge variant="secondary">{todayProspects.length}</Badge>
        </div>

        {todayProspects.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No hay contactos programados para hoy
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="hidden md:block">
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Nombre</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Propietario</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Categoria</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Estado</th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayProspects.map((p) => {
                        const status = getStatusInfo(p.estadoProspecto)
                        return (
                          <tr key={p.id} className="border-b last:border-0">
                            <td className="px-4 py-3 font-medium">{p.nombreNegocio}</td>
                            <td className="px-4 py-3 text-muted-foreground">{p.propietario}</td>
                            <td className="px-4 py-3 text-muted-foreground">{p.categoria}</td>
                            <td className="px-4 py-3">
                              <Badge className={cn("text-xs", status.color)}>{status.label}</Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {p.whatsapp && (
                                  <a
                                    href={`https://wa.me/${p.whatsapp.replace(/[^0-9]/g, "")}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Button variant="ghost" size="icon-sm">
                                      <MessageCircle className="size-4 text-green-600" />
                                    </Button>
                                  </a>
                                )}
                                {p.telefono && (
                                  <a href={`tel:${p.telefono}`}>
                                    <Button variant="ghost" size="icon-sm">
                                      <Phone className="size-4" />
                                    </Button>
                                  </a>
                                )}
                                <Link href={`/admin/prospects/${p.id}?tab=sales-script`}>
                                  <Button variant="ghost" size="icon-sm">
                                    <ClipboardCheck className="size-4" />
                                  </Button>
                                </Link>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>

            <div className="md:hidden space-y-3">
              {todayProspects.map((p) => {
                const status = getStatusInfo(p.estadoProspecto)
                return (
                  <Card key={p.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{p.nombreNegocio}</p>
                          <p className="text-xs text-muted-foreground">{p.propietario}</p>
                        </div>
                        <Badge className={cn("text-xs", status.color)}>{status.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{p.categoria}</p>
                      <div className="flex items-center gap-1 pt-1">
                        {p.whatsapp && (
                          <a
                            href={`https://wa.me/${p.whatsapp.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="outline" size="sm" className="gap-1.5">
                              <MessageCircle className="size-3.5 text-green-600" /> WhatsApp
                            </Button>
                          </a>
                        )}
                        {p.telefono && (
                          <a href={`tel:${p.telefono}`}>
                            <Button variant="outline" size="sm" className="gap-1.5">
                              <Phone className="size-3.5" /> Llamar
                            </Button>
                          </a>
                        )}
                        <Link href={`/admin/prospects/${p.id}?tab=sales-script`}>
                          <Button variant="outline" size="sm" className="gap-1.5">
                            <ClipboardCheck className="size-3.5" /> Seguimiento
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
