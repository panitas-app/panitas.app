"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PROSPECT_CATEGORIES } from "@/lib/crm/constants"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"

interface Prospect {
  id: string
  nombreNegocio: string
  propietario: string
  telefono: string | null
  whatsapp: string | null
  email: string | null
  instagram: string | null
  facebook: string | null
  paginaWeb: string | null
  ciudad: string | null
  estado: string | null
  pais: string | null
  direccion: string | null
  categoria: string
}

interface ProspectFormProps {
  initialData?: Prospect
  onSuccess: () => void
  onCancel: () => void
}

export function ProspectForm({ initialData, onSuccess, onCancel }: ProspectFormProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombreNegocio: initialData?.nombreNegocio ?? "",
    propietario: initialData?.propietario ?? "",
    telefono: initialData?.telefono ?? "",
    whatsapp: initialData?.whatsapp ?? "",
    email: initialData?.email ?? "",
    instagram: initialData?.instagram ?? "",
    facebook: initialData?.facebook ?? "",
    ciudad: initialData?.ciudad ?? "",
    estado: initialData?.estado ?? "",
    pais: initialData?.pais ?? "Venezuela",
    direccion: initialData?.direccion ?? "",
    categoria: initialData?.categoria ?? "",
  })

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.nombreNegocio.trim() || !form.propietario.trim()) {
      toast.error("Nombre del negocio y propietario son requeridos")
      return
    }

    if (!form.categoria) {
      toast.error("Selecciona una categoría")
      return
    }

    setLoading(true)
    try {
      const url = initialData
        ? `/api/admin/prospects/${initialData.id}`
        : "/api/admin/prospects"

      const res = await fetch(url, {
        method: initialData ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombreNegocio: form.nombreNegocio.trim(),
          propietario: form.propietario.trim(),
          telefono: form.telefono.trim() || null,
          whatsapp: form.whatsapp.trim() || null,
          email: form.email.trim() || null,
          instagram: form.instagram.trim() || null,
          facebook: form.facebook.trim() || null,
          ciudad: form.ciudad.trim() || null,
          estado: form.estado.trim() || null,
          pais: form.pais.trim() || "Venezuela",
          direccion: form.direccion.trim() || null,
          categoria: form.categoria,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al guardar")
      }

      toast.success(initialData ? "Prospecto actualizado" : "Prospecto creado")
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error inesperado")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="nombreNegocio">Nombre del negocio *</Label>
          <Input
            id="nombreNegocio"
            value={form.nombreNegocio}
            onChange={(e) => updateField("nombreNegocio", e.target.value)}
            placeholder="Ej: Ferretería El Martillo"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="propietario">Propietario *</Label>
          <Input
            id="propietario"
            value={form.propietario}
            onChange={(e) => updateField("propietario", e.target.value)}
            placeholder="Nombre completo"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="telefono">Teléfono</Label>
          <Input
            id="telefono"
            type="tel"
            value={form.telefono}
            onChange={(e) => updateField("telefono", e.target.value)}
            placeholder="+58 412 1234567"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input
            id="whatsapp"
            type="tel"
            value={form.whatsapp}
            onChange={(e) => updateField("whatsapp", e.target.value)}
            placeholder="+58 412 1234567"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="correo@ejemplo.com"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="instagram">Instagram</Label>
          <Input
            id="instagram"
            value={form.instagram}
            onChange={(e) => updateField("instagram", e.target.value)}
            placeholder="@usuario"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="facebook">Facebook</Label>
          <Input
            id="facebook"
            value={form.facebook}
            onChange={(e) => updateField("facebook", e.target.value)}
            placeholder="URL o usuario"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ciudad">Ciudad</Label>
          <Input
            id="ciudad"
            value={form.ciudad}
            onChange={(e) => updateField("ciudad", e.target.value)}
            placeholder="Caracas"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="estado">Estado</Label>
          <Input
            id="estado"
            value={form.estado}
            onChange={(e) => updateField("estado", e.target.value)}
            placeholder="Miranda"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pais">País</Label>
          <Input
            id="pais"
            value={form.pais}
            onChange={(e) => updateField("pais", e.target.value)}
            placeholder="Venezuela"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Categoría *</Label>
          <Select value={form.categoria || undefined} onValueChange={(val) => updateField("categoria", val ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar categoría" />
            </SelectTrigger>
            <SelectContent>
              {PROSPECT_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="direccion">Dirección</Label>
        <Textarea
          id="direccion"
          value={form.direccion}
          onChange={(e) => updateField("direccion", e.target.value)}
          placeholder="Dirección completa"
          rows={2}
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {initialData ? "Actualizar" : "Crear prospecto"}
        </Button>
      </div>
    </form>
  )
}
