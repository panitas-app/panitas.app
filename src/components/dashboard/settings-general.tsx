"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { useState } from "react"
import type { Store } from "@prisma/client"

export function SettingsGeneral({ store }: { store: Store }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  const s = store as any
  const [freeShippingActive, setFreeShippingActive] = useState<boolean>(s.freeShippingActive ?? false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    try {
      const res = await fetch("/api/stores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingCost: form.get("shippingCost"),
          freeShippingActive,
          freeShippingMinAmount: freeShippingActive ? form.get("freeShippingMinAmount") : 0,
        }),
      })
      if (!res.ok) throw new Error("Error")
      toast.success("Configuración de envío guardada")
      router.refresh()
    } catch {
      toast.error("Error al guardar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="shippingCost">Costo base de envío / delivery ($ USD)</Label>
        <Input
          id="shippingCost"
          name="shippingCost"
          type="number"
          step="0.01"
          defaultValue={s.shippingCost ?? 0}
          required
        />
        <p className="text-xs text-muted-foreground">
          Tarifa plana que se cobrará al cliente por agencia de envíos o delivery local.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-xl border p-4 shadow-xs bg-muted/10">
        <div className="space-y-0.5 max-w-[80%]">
          <Label htmlFor="freeShippingActive" className="text-sm font-medium">Ofrecer Envío Gratis</Label>
          <p className="text-xs text-muted-foreground">
            Activa el envío gratis nacional si el cliente supera un monto de compra determinado.
          </p>
        </div>
        <Switch
          id="freeShippingActive"
          checked={freeShippingActive}
          onCheckedChange={setFreeShippingActive}
        />
      </div>

      {freeShippingActive && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <Label htmlFor="freeShippingMinAmount">Monto mínimo de compra para Envío Gratis ($ USD)</Label>
          <Input
            id="freeShippingMinAmount"
            name="freeShippingMinAmount"
            type="number"
            step="0.01"
            defaultValue={s.freeShippingMinAmount ?? 0}
            required
            placeholder="Ej: 30.00"
          />
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full sm:w-auto">
        {loading ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  )
}
