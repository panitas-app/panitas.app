"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { SalesScriptTab } from "@/components/admin/prospects/sales-script-tab"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PROSPECT_CATEGORIES } from "@/lib/crm/constants"
import { Loader2, CheckCircle2, Play } from "lucide-react"
import { toast } from "sonner"

export default function NuevoProspectoPage() {
  const router = useRouter()
  const [prospectId, setProspectId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)
  const [form, setForm] = useState({ nombreNegocio: "", propietario: "", categoria: "Otro" })
  const redirectTimer = useRef<NodeJS.Timeout | null>(null)

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleCreate() {
    const negocio = form.nombreNegocio.trim()
    const prop = form.propietario.trim()
    if (!negocio || !prop) {
      toast.error("Nombre del negocio y propietario son requeridos")
      return
    }
    setCreating(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombreNegocio: negocio,
          propietario: prop,
          categoria: form.categoria,
          pais: "Venezuela",
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Error al crear prospecto")
      }
      const data = await res.json()
      setProspectId(data.id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error inesperado"
      setError(msg)
      toast.error(msg)
      setCreating(false)
    }
  }

  function handleSessionComplete(id: string) {
    setCompleted(true)
    redirectTimer.current = setTimeout(() => {
      router.push(`/admin/prospects/${id}`)
    }, 2000)
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <p className="text-destructive font-medium">Error al crear prospecto</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => { setError(null); setCreating(false) }}>
              Intentar de nuevo
            </Button>
            <Button variant="outline" onClick={() => router.push("/admin/prospects/lista")}>
              Volver a lista
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (completed) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <CheckCircle2 className="size-12 text-green-500 mx-auto" />
          <p className="text-lg font-medium">Prospecto creado y visita finalizada</p>
          <p className="text-sm text-muted-foreground">Redirigiendo al detalle del prospecto...</p>
        </CardContent>
      </Card>
    )
  }

  if (!prospectId) {
    return (
      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nuevo Prospecto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ingresa los datos basicos del negocio para comenzar la visita.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="nombreNegocio">Nombre del negocio *</Label>
              <Input
                id="nombreNegocio"
                value={form.nombreNegocio}
                onChange={(e) => updateField("nombreNegocio", e.target.value)}
                placeholder="Ej: Ferretería El Martillo"
                disabled={creating}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="propietario">Propietario *</Label>
              <Input
                id="propietario"
                value={form.propietario}
                onChange={(e) => updateField("propietario", e.target.value)}
                placeholder="Nombre completo"
                disabled={creating}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="categoria">Categoria</Label>
              <Select
                value={form.categoria}
                onValueChange={(val) => val && updateField("categoria", val)}
                disabled={creating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROSPECT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => router.push("/admin/prospects/lista")} disabled={creating}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={creating} className="flex-1 gap-1.5">
                {creating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Play className="size-4" />
                )}
                {creating ? "Creando..." : "Iniciar visita"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <SalesScriptTab
        prospectId={prospectId}
        autoStart
        onSessionComplete={handleSessionComplete}
        prospect={{
          nombreNegocio: form.nombreNegocio,
          propietario: form.propietario,
          categoria: form.categoria,
          estadoProspecto: "nuevo",
          telefono: null,
          whatsapp: null,
          email: null,
          instagram: null,
          facebook: null,
          paginaWeb: null,
          ciudad: null,
          estado: null,
          direccion: null,
          notas: null,
        }}
      />
    </div>
  )
}
