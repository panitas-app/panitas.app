"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings2 } from "lucide-react"

export default function AdminSettingsPage() {
  const [, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(d => { setSettings(d || {}); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Cargando...</div>

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Configuración Global</h1>
        <p className="text-sm text-muted-foreground">Ajustes generales de la plataforma</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings2 className="size-4" /> Próximamente</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Esta sección permitirá configurar: SMTP, Cloudinary, límites de planes,
            políticas de seguridad, backups y más.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
