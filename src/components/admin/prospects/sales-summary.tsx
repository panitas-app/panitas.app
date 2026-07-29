"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { SalesScoringBar } from "./sales-scoring-bar"
import { getPlanInfo, SALES_ROUTES, getTemperatureInfo } from "@/lib/crm/constants"
import { getDemoSteps, getDemoTitle, getOpportunityDescription } from "@/lib/crm/scoring"
import {
  ArrowLeft,
  CheckCircle2,
  CalendarCheck,
  AlertTriangle,
  Package,
  Save,
  User,
  Loader2,
  Route,
  Play,
} from "lucide-react"

interface SalesSummaryProps {
  session: {
    puntuacion: number
    temperatura: string
    planRecomendado: string
    planSeleccionado?: string | null
    routeSeleccionada?: string | null
    resumen: string
    objeciones?: string | null
    completadaAt?: string | null
  }
  prospect: {
    nombreNegocio: string
    propietario: string
    telefono: string | null
    whatsapp: string | null
    email: string | null
    instagram: string | null
    facebook: string | null
    ciudad: string | null
    estado: string | null
    direccion: string | null
    notas: string | null
  }
  finalized?: boolean
  onComplete: () => void
  onBack: () => void
  onSaveAndComplete: (prospectData: Record<string, unknown>) => void
}

function parseResumenSections(resumen: string) {
  const lines = resumen.split("\n").filter(Boolean)
  const sections: { title: string; items: string[] }[] = []
  let current: { title: string; items: string[] } | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.endsWith(":") || (trimmed.includes(":") && !trimmed.startsWith("-") && !trimmed.startsWith(" "))) {
      if (current) sections.push(current)
      current = { title: trimmed.replace(/:$/, ""), items: [] }
    } else if (trimmed.startsWith("- ") && current) {
      current.items.push(trimmed.replace(/^- /, ""))
    } else if (current) {
      current.items.push(trimmed)
    }
  }
  if (current) sections.push(current)

  return sections
}

export function SalesSummary({ session, prospect, finalized, onComplete, onBack, onSaveAndComplete }: SalesSummaryProps) {
  const planInfo = getPlanInfo(session.planRecomendado)
  const sections = parseResumenSections(session.resumen)
  const route = session.routeSeleccionada ? SALES_ROUTES.find((r) => r.value === session.routeSeleccionada) : null
  const tempInfo = getTemperatureInfo(session.temperatura)
  const opportunityText = getOpportunityDescription(session.puntuacion)

  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    nombreNegocio: prospect.nombreNegocio || "",
    propietario: prospect.propietario || "",
    telefono: prospect.telefono || "",
    whatsapp: prospect.whatsapp || "",
    email: prospect.email || "",
    instagram: prospect.instagram || "",
    facebook: prospect.facebook || "",
    ciudad: prospect.ciudad || "",
    estado: prospect.estado || "",
    direccion: prospect.direccion || "",
    notas: prospect.notas || "",
  })

  async function handleSave() {
    setSaving(true)
    onSaveAndComplete({
      nombreNegocio: formData.nombreNegocio.trim(),
      propietario: formData.propietario.trim(),
      telefono: formData.telefono.trim() || null,
      whatsapp: formData.whatsapp.trim() || null,
      email: formData.email.trim() || null,
      instagram: formData.instagram.trim() || null,
      facebook: formData.facebook.trim() || null,
      ciudad: formData.ciudad.trim() || null,
      estado: formData.estado.trim() || null,
      direccion: formData.direccion.trim() || null,
      notas: formData.notas.trim() || null,
    })
  }

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const problemaSection = sections.find((s) =>
    s.title.toLowerCase().includes("problema")
  )
  const positivoSection = sections.find((s) =>
    s.title.toLowerCase().includes("positivo") || s.title.toLowerCase().includes("puntos")
  )
  const accionSection = sections.find((s) =>
    s.title.toLowerCase().includes("proxima") || s.title.toLowerCase().includes("siguiente")
  )
  const clienteSection = sections.find((s) =>
    s.title.toLowerCase().includes("cliente")
  )

  const demoSteps = session.routeSeleccionada ? getDemoSteps(session.routeSeleccionada) : []
  const demoTitle = session.routeSeleccionada ? getDemoTitle(session.routeSeleccionada) : ""

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumen de la Visita</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <SalesScoringBar score={session.puntuacion} temperatura={session.temperatura} />

          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {route && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Route className="size-3" />
                  {route.label}
                </Badge>
              )}
              <Badge variant="secondary" className="flex items-center gap-1">
                <Package className="size-3" />
                {planInfo.label} — {planInfo.precio}
              </Badge>
              <Badge className={tempInfo.color}>{tempInfo.label}</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold">{session.puntuacion} pts</span>
              <span className="text-muted-foreground">— {opportunityText}</span>
            </div>
          </div>

          {clienteSection && clienteSection.items.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <User className="size-4" />
                {clienteSection.title}
              </p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                {clienteSection.items.map((item, i) => (
                  <p key={i} className="text-sm">{item}</p>
                ))}
              </div>
            </div>
          )}

          {problemaSection && problemaSection.items.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className="size-4" />
                {problemaSection.title}
              </p>
              <ul className="space-y-1.5">
                {problemaSection.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-destructive mt-0.5">&bull;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {positivoSection && positivoSection.items.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-green-500" />
                {positivoSection.title}
              </p>
              <ul className="space-y-1.5">
                {positivoSection.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-green-500 mt-0.5">&bull;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {demoSteps.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Play className="size-4" />
                {demoTitle}
              </p>
              <ul className="space-y-1.5">
                {demoSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-primary font-mono text-xs mt-0.5">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {accionSection && accionSection.items.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <CalendarCheck className="size-4" />
                {accionSection.title}
              </p>
              <p className="text-sm font-medium bg-muted/50 rounded-lg p-3">
                {accionSection.items.join(" ")}
              </p>
            </div>
          )}

          {session.objeciones && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className="size-4" />
                Objeciones detectadas
              </p>
              <p className="text-sm bg-muted/50 rounded-lg p-3 whitespace-pre-wrap">
                {session.objeciones}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {!finalized && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="size-5" />
              Datos del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sum-nombreNegocio">Nombre del negocio *</Label>
                <Input
                  id="sum-nombreNegocio"
                  value={formData.nombreNegocio}
                  onChange={(e) => updateField("nombreNegocio", e.target.value)}
                  placeholder="Nombre del negocio"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sum-propietario">Propietario *</Label>
                <Input
                  id="sum-propietario"
                  value={formData.propietario}
                  onChange={(e) => updateField("propietario", e.target.value)}
                  placeholder="Nombre del propietario"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sum-telefono">Telefono</Label>
                <Input
                  id="sum-telefono"
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => updateField("telefono", e.target.value)}
                  placeholder="+58 412 1234567"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sum-whatsapp">WhatsApp</Label>
                <Input
                  id="sum-whatsapp"
                  type="tel"
                  value={formData.whatsapp}
                  onChange={(e) => updateField("whatsapp", e.target.value)}
                  placeholder="+58 412 1234567"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sum-email">Email</Label>
                <Input
                  id="sum-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sum-instagram">Instagram</Label>
                <Input
                  id="sum-instagram"
                  value={formData.instagram}
                  onChange={(e) => updateField("instagram", e.target.value)}
                  placeholder="@usuario"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sum-facebook">Facebook</Label>
                <Input
                  id="sum-facebook"
                  value={formData.facebook}
                  onChange={(e) => updateField("facebook", e.target.value)}
                  placeholder="URL o usuario"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sum-ciudad">Ciudad</Label>
                <Input
                  id="sum-ciudad"
                  value={formData.ciudad}
                  onChange={(e) => updateField("ciudad", e.target.value)}
                  placeholder="Caracas"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sum-estado">Estado</Label>
                <Input
                  id="sum-estado"
                  value={formData.estado}
                  onChange={(e) => updateField("estado", e.target.value)}
                  placeholder="Miranda"
                />
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              <Label htmlFor="sum-direccion">Direccion</Label>
              <Textarea
                id="sum-direccion"
                value={formData.direccion}
                onChange={(e) => updateField("direccion", e.target.value)}
                placeholder="Direccion completa"
                rows={2}
              />
            </div>
            <div className="mt-4 space-y-1.5">
              <Label htmlFor="sum-notas">Notas adicionales</Label>
              <Textarea
                id="sum-notas"
                value={formData.notas}
                onChange={(e) => updateField("notas", e.target.value)}
                placeholder="Notas sobre la visita..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {finalized && (
        <Card>
          <CardContent className="py-6 text-center">
            <CheckCircle2 className="size-10 text-green-500 mx-auto mb-2" />
            <p className="font-medium">Visita finalizada exitosamente</p>
            <p className="text-sm text-muted-foreground">
              Los datos del cliente han sido guardados
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="size-4" />
          Volver
        </Button>
        {!finalized && (
          <Button
            onClick={handleSave}
            disabled={saving || !formData.nombreNegocio.trim() || !formData.propietario.trim()}
            className="flex-1"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Guardar y Finalizar
          </Button>
        )}
      </div>
    </div>
  )
}
