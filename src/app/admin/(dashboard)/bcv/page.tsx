"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, RefreshCw, TrendingUp, TrendingDown } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface BcvData {
  current: { id: string; rate: number; createdAt: string; source: string | null; publishedDate: string | null } | null
  history: Array<{ rate: number; createdAt: string; source: string | null }>
  totalRecords: number
  lastUpdate: string | null
  source: string | null
}

export default function AdminBcvPage() {
  const [data, setData] = useState<BcvData | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/bcv")
      setData(await res.json())
    } catch { toast.error("Error al cargar") }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  async function handleForceUpdate() {
    setUpdating(true)
    try {
      const res = await fetch("/api/admin/bcv", { method: "POST" })
      const result = await res.json()
      if (result.action === "updated") toast.success(`Tasa actualizada: Bs. ${result.rate}`)
      else if (result.action === "no_change") toast.info("La tasa no cambió")
      else if (result.action === "fetch_error") toast.error("Error al consultar fuentes")
      else toast.success("OK")
      loadData()
    } catch { toast.error("Error") }
    finally { setUpdating(false) }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Cargando...</div>

  const current = data?.current

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasa BCV</h1>
          <p className="text-sm text-muted-foreground">Gestión de la tasa de cambio oficial</p>
        </div>
        <Button onClick={handleForceUpdate} disabled={updating} className="gap-2">
          <RefreshCw className={`size-4 ${updating ? "animate-spin" : ""}`} />
          {updating ? "Actualizando..." : "Forzar actualización"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="size-7 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tasa actual</p>
                <p className="text-4xl font-black">Bs. {current?.rate.toFixed(4) || "—"}</p>
                {current && (
                  <div className="flex items-center gap-3 mt-1">
                    <Badge variant="outline" className="text-xs">{current.source || "desconocida"}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(current.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Registros totales</p>
            <p className="text-3xl font-bold mt-1">{data?.totalRecords || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">en la base de datos</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Historial (últimos 30 registros)</CardTitle></CardHeader>
        <CardContent>
          {data?.history && data.history.length > 0 ? (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {[...data.history].reverse().map((h, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/30 text-sm">
                  <span className="font-mono font-bold">Bs. {h.rate.toFixed(4)}</span>
                  <div className="flex items-center gap-2">
                    {h.source && <Badge variant="outline" className="text-[10px]">{h.source}</Badge>}
                    <span className="text-xs text-muted-foreground">{format(new Date(h.createdAt), "dd/MM HH:mm")}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">Sin historial</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
