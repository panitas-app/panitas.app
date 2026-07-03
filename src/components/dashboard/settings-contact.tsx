"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useState } from "react"
import type { Store } from "@prisma/client"

export function SettingsContact({ store }: { store: Store }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    try {
      const res = await fetch("/api/stores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsapp: form.get("whatsapp"),
          email: form.get("email"),
          phone: form.get("phone"),
          address: form.get("address"),
        }),
      })
      if (!res.ok) throw new Error("Error")
      toast.success("Contacto guardado")
      router.refresh()
    } catch {
      toast.error("Error al guardar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="whatsapp">WhatsApp (con código de país)</Label>
        <Input id="whatsapp" name="whatsapp" defaultValue={store.whatsapp || ""} placeholder="+584141234567" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" defaultValue={store.email || ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Teléfono</Label>
        <Input id="phone" name="phone" defaultValue={store.phone || ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Dirección</Label>
        <Textarea id="address" name="address" defaultValue={store.address || ""} rows={2} />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  )
}
