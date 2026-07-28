"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SalesScriptAdmin } from "@/components/admin/prospects/sales-script-admin"
import { ArrowLeft } from "lucide-react"

export default function GuionConfigPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/prospects/configuracion">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Administrar Guion de Venta</h1>
          <p className="text-sm text-muted-foreground">
            Configura las secciones, preguntas y reglas de scoring del guion de visita
          </p>
        </div>
      </div>

      <SalesScriptAdmin />
    </div>
  )
}
