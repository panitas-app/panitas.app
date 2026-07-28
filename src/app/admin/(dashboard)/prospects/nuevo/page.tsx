"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { SalesScriptTab } from "@/components/admin/prospects/sales-script-tab"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

export default function NuevoProspectoPage() {
  const router = useRouter()
  const [prospectId, setProspectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)
  const redirectTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    async function createProspect() {
      try {
        const res = await fetch("/api/admin/prospects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombreNegocio: "",
            propietario: "",
            categoria: "Otro",
            pais: "Venezuela",
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Error al crear prospecto")
        }
        const data = await res.json()
        setProspectId(data.id)
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error inesperado"
        setError(msg)
        toast.error(msg)
      } finally {
        setLoading(false)
      }
    }
    createProspect()
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current)
    }
  }, [])

  function handleSessionComplete(id: string) {
    setCompleted(true)
    redirectTimer.current = setTimeout(() => {
      router.push(`/admin/prospects/${id}`)
    }, 2000)
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive font-medium">Error al crear prospecto</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/admin/prospects/lista")}>
            Volver a lista
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (loading || !prospectId) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span>Preparando nuevo prospecto...</span>
      </div>
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

  return (
    <div className="max-w-4xl">
      <SalesScriptTab
        prospectId={prospectId}
        autoStart
        onSessionComplete={handleSessionComplete}
        prospect={{
          nombreNegocio: "",
          propietario: "",
          categoria: "Otro",
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
