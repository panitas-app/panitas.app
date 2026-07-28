"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SalesScoringBar } from "./sales-scoring-bar"
import { getPlanInfo, getTemperatureInfo } from "@/lib/crm/constants"
import { cn } from "@/lib/utils"
import { ArrowLeft, CheckCircle2, CalendarCheck, AlertTriangle, Package } from "lucide-react"

interface SalesSummaryProps {
  session: {
    puntuacion: number
    temperatura: string
    planRecomendado: string
    resumen: string
    objeciones?: string | null
    completadaAt?: string | null
  }
  onComplete: () => void
  onBack: () => void
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

function getActionSugerida(resumen: string): string | null {
  const lower = resumen.toLowerCase()
  if (lower.includes("proxima accion:") || lower.includes("próxima acción:")) {
    const line = resumen.split("\n").find((l) =>
      l.toLowerCase().includes("proxima accion:") || l.toLowerCase().includes("próxima acción:")
    )
    if (line) return line.split(":").slice(1).join(":").trim()
  }
  if (lower.includes("demostracion") || lower.includes("demostración")) {
    return "Programar demostracion"
  }
  return null
}

export function SalesSummary({ session, onComplete, onBack }: SalesSummaryProps) {
  const planInfo = getPlanInfo(session.planRecomendado)
  const tempInfo = getTemperatureInfo(session.temperatura)
  const sections = parseResumenSections(session.resumen)
  const accionSugerida = getActionSugerida(session.resumen)

  const problemaSections = sections.filter((s) =>
    s.title.toLowerCase().includes("problema")
  )
  const positivoSections = sections.filter((s) =>
    s.title.toLowerCase().includes("positivo")
  )

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumen de la Visita</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <SalesScoringBar score={session.puntuacion} temperatura={session.temperatura} />

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Package className="size-4" />
              Plan Recomendado
            </div>
            <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 space-y-1.5">
              <p className="font-semibold text-foreground">
                {planInfo.label} — {planInfo.precio}
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {planInfo.features.map((f) => (
                  <li
                    key={f}
                    className="text-xs bg-background rounded-full px-2.5 py-1 border"
                  >
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {problemaSections.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <AlertTriangle className="size-4" />
                Problemas detectados
              </div>
              <ul className="space-y-1.5">
                {problemaSections.flatMap((s) => s.items).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-destructive mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {positivoSections.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CheckCircle2 className="size-4 text-green-500" />
                Puntos positivos
              </div>
              <ul className="space-y-1.5">
                {positivoSections.flatMap((s) => s.items).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-green-500 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {accionSugerida && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CalendarCheck className="size-4" />
                Proxima accion sugerida
              </div>
              <p className="text-sm font-medium bg-muted/50 rounded-lg p-3">
                {accionSugerida}
              </p>
            </div>
          )}

          {session.objeciones && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <AlertTriangle className="size-4" />
                Objeciones detectadas
              </div>
              <p className="text-sm bg-muted/50 rounded-lg p-3 whitespace-pre-wrap">
                {session.objeciones}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse sm:flex-row gap-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="size-4" />
          Volver
        </Button>
        <Button onClick={onComplete} className="flex-1">
          <CheckCircle2 className="size-4" />
          Finalizar Visita
        </Button>
      </div>
    </div>
  )
}
