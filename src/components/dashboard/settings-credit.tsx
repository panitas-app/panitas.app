"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"

interface Props {
  storeId: string
  initialCreditDays: string
}

export function SettingsCredit({ storeId, initialCreditDays }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [days, setDays] = useState<string[]>(
    initialCreditDays ? initialCreditDays.split(",").map((d) => d.trim()) : ["5", "10", "15", "30"]
  )

  function addDay() {
    setDays([...days, ""])
  }

  function removeDay(index: number) {
    setDays(days.filter((_, i) => i !== index))
  }

  function updateDay(index: number, value: string) {
    const next = [...days]
    next[index] = value
    setDays(next)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const validDays = days.filter((d) => {
      const n = parseInt(d)
      return !isNaN(n) && n > 0
    })
    if (validDays.length === 0) {
      toast.error("Agrega al menos un día de crédito válido")
      setLoading(false)
      return
    }
    try {
      const res = await fetch("/api/stores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creditDays: validDays.join(",") }),
      })
      if (!res.ok) throw new Error("Error")
      toast.success("Días de crédito guardados")
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
        <Label>Opciones de días de crédito</Label>
        <p className="text-xs text-muted-foreground">
          Define los días de crédito disponibles al hacer una venta. Se mostrarán como opciones al crear una nueva venta.
        </p>
      </div>
      <div className="space-y-3">
        {days.map((day, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              placeholder="Ej: 15"
              value={day}
              onChange={(e) => updateDay(i, e.target.value)}
              className="max-w-[120px]"
            />
            <span className="text-sm text-muted-foreground">días</span>
            <Button type="button" variant="ghost" size="icon" onClick={() => removeDay(i)} className="text-red-500 hover:text-red-600">
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addDay} className="gap-2">
        <Plus className="size-4" />
        Agregar días
      </Button>
      <div>
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Guardar configuración"}
        </Button>
      </div>
    </form>
  )
}
