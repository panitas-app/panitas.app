"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PROSPECT_STATUSES, PROSPECT_CATEGORIES } from "@/lib/crm/constants"
import { cn } from "@/lib/utils"
import {
  Settings,
  ListChecks,
  Tag,
  Activity,
  ExternalLink,
} from "lucide-react"

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Configuracion del CRM</h1>
        <p className="text-sm text-muted-foreground">
          Administra las opciones y categorias del sistema de prospectos
        </p>
      </div>

      <Link href="/admin/prospects/configuracion/guion">
        <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <ListChecks className="size-6 text-primary/60" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">Guion de Venta</p>
              <p className="text-sm text-muted-foreground">
                Administra las preguntas del asistente de venta y reglas de scoring
              </p>
            </div>
            <ExternalLink className="size-4 text-muted-foreground shrink-0" />
          </CardContent>
        </Card>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="size-4" />
            Categorias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Categorias disponibles para clasificar prospectos:
          </p>
          <div className="flex flex-wrap gap-2">
            {PROSPECT_CATEGORIES.map((cat) => (
              <Badge key={cat} variant="secondary" className="text-xs">
                {cat}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="size-4" />
            Estados del Prospecto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Estados del embudo de ventas:
          </p>
          <div className="flex flex-wrap gap-2">
            {PROSPECT_STATUSES.map((s) => (
              <Badge key={s.value} className={cn("text-xs", s.color)}>
                {s.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
