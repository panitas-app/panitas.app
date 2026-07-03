"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Zap, MessageCircle, Clock, Users, ShoppingCart, Power, List } from "lucide-react"
import { toast } from "sonner"

const ICON_MAP: Record<string, typeof Clock> = {
  appointment_reminder: Clock,
  post_appointment: MessageCircle,
  post_purchase: ShoppingCart,
  inactive_client: Users,
  custom: Zap,
}

const LABEL_MAP: Record<string, string> = {
  appointment_reminder: "Recordatorio de cita",
  post_appointment: "Seguimiento post cita",
  post_purchase: "Seguimiento post compra",
  inactive_client: "Clientes inactivos",
  custom: "Mensaje personalizado",
}

const DESC_MAP: Record<string, string> = {
  appointment_reminder: "Envía un recordatorio automático 24h antes de la cita",
  post_appointment: "Pregunta al cliente cómo le fue después de su cita",
  post_purchase: "Da las gracias y pide reseña después de una compra",
  inactive_client: "Re-engancha clientes que no han vuelto en 90 días",
  custom: "Crea tu propia automatización con trigger y mensaje",
}

type Automation = { id: string; name: string; trigger: string; isActive: boolean }
type LogEntry = { id: string; triggeredAt: string; status: string; result: string | null; automation: { name: string; trigger: string }; customer: { name: string } | null }

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showLogs, setShowLogs] = useState(false)

  useEffect(() => {
    async function load() {
      const [aRes, lRes] = await Promise.all([fetch("/api/automations"), fetch("/api/automations/logs?limit=20")])
      if (aRes.ok) setAutomations(await aRes.json())
      if (lRes.ok) setLogs(await lRes.json())
      setLoading(false)
    }
    load()
  }, [])

  async function toggle(automation: Automation) {
    const res = await fetch(`/api/automations/${automation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !automation.isActive }),
    })
    if (res.ok) {
      setAutomations((prev) => prev.map((a) => a.id === automation.id ? { ...a, isActive: !a.isActive } : a))
      toast.success(automation.isActive ? "Desactivada" : "Activada")
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20 text-sm text-slate-400">Cargando...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-extrabold text-[#102A43]">Automatizaciones</h1>
        <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => setShowLogs(!showLogs)}>
          <List className="size-3.5" /> {showLogs ? "Ocultar historial" : "Historial"}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {automations.map((auto) => {
          const Icon = ICON_MAP[auto.trigger] || Zap
          const label = LABEL_MAP[auto.trigger] || auto.name
          const desc = DESC_MAP[auto.trigger] || ""
          return (
            <Card key={auto.id} className={`rounded-xl border ${auto.isActive ? "border-primary/30 bg-primary/5" : "border-border"} transition-all`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={`flex size-10 items-center justify-center rounded-xl ${auto.isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                    <Icon className="size-5" />
                  </div>
                  <Button variant="ghost" size="icon" className={`size-7 ${auto.isActive ? "text-green-600" : "text-slate-300"}`} onClick={() => toggle(auto)}>
                    <Power className="size-3.5" />
                  </Button>
                </div>
                <CardTitle className="text-sm font-bold text-[#102A43] mt-2">{label}</CardTitle>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <Badge variant="outline" className={`text-[10px] ${auto.isActive ? "bg-green-50 text-green-700 border-green-200" : "text-muted-foreground"}`}>
                  {auto.isActive ? "Activo" : "Inactivo"}
                </Badge>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {showLogs && (
        <Card className="mt-6 rounded-xl">
          <CardHeader><CardTitle className="text-sm font-bold">Historial de ejecución</CardTitle></CardHeader>
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-slate-400">Sin ejecuciones registradas.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <p className="text-sm font-semibold text-[#102A43]">{log.automation.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.customer?.name ? `Cliente: ${log.customer.name} · ` : ""}
                        {new Date(log.triggeredAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${log.status === "sent" ? "bg-green-50 text-green-700 border-green-200" : log.status === "failed" ? "bg-red-50 text-red-700 border-red-200" : "bg-slate-50 text-slate-500"}`}>
                      {log.status === "sent" ? "Enviado" : log.status === "failed" ? "Falló" : "Saltado"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
