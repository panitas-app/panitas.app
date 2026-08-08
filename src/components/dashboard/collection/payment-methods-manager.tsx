"use client"

import { useCallback, useEffect, useState } from "react"
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { LEVEL_META, type CollectionLevel, type CollectionSettings } from "./collection-types"

const LEVELS: CollectionLevel[] = [1, 2, 3]

export function PaymentMethodsManager() {
  const [settings, setSettings] = useState<CollectionSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newMethod, setNewMethod] = useState("")

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/collection/settings")
      if (!res.ok) throw new Error("Error al cargar configuración")
      const data = await res.json()
      setSettings(data.settings)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar configuración")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  function updatePatch(patch: Partial<CollectionSettings>) {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  function moveMethod(index: number, delta: number) {
    setSettings((prev) => {
      if (!prev) return prev
      const next = [...prev.paymentMethods]
      const target = index + delta
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...prev, paymentMethods: next }
    })
  }

  function removeMethod(index: number) {
    setSettings((prev) => {
      if (!prev) return prev
      return { ...prev, paymentMethods: prev.paymentMethods.filter((_, i) => i !== index) }
    })
  }

  function addMethod() {
    const value = newMethod.trim()
    if (!value) return
    setSettings((prev) => {
      if (!prev) return prev
      if (prev.paymentMethods.some((m) => m.toLowerCase() === value.toLowerCase())) {
        toast.error("Ese método ya existe")
        return prev
      }
      return { ...prev, paymentMethods: [...prev.paymentMethods, value] }
    })
    setNewMethod("")
  }

  async function save() {
    if (!settings) return
    if (settings.paymentMethods.length === 0) {
      toast.error("Agrega al menos un método de pago")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/collection/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethods: settings.paymentMethods,
          defaultLevel: settings.defaultLevel,
          businessName: settings.businessName,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al guardar configuración")
      }
      const data = await res.json()
      setSettings(data.settings)
      toast.success("Configuración guardada")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar configuración")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-xs text-muted-foreground py-10 text-center">Cargando configuración...</p>
  }

  if (!settings) return null

  return (
    <div className="max-w-xl space-y-5">
      <div className="space-y-2">
        <Label>Nombre del negocio en los mensajes</Label>
        <Input
          value={settings.businessName}
          onChange={(e) => updatePatch({ businessName: e.target.value })}
          placeholder="Mi Negocio"
          maxLength={80}
        />
        <p className="text-[11px] text-muted-foreground">
          Se inyecta en la variable <code className="rounded bg-muted px-1 text-[10px]">{"{{nombre_negocio}}"}</code>.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Nivel de cobranza preferido</Label>
        <Select
          value={String(settings.defaultLevel)}
          onValueChange={(v) => updatePatch({ defaultLevel: Number(v) as CollectionLevel })}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LEVELS.map((l) => (
              <SelectItem key={l} value={String(l)}>
                Nivel {l} · {LEVEL_META[l].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">
          Nivel inicial sugerido al preparar recordatorios (se puede cambiar manualmente).
        </p>
      </div>

      <div className="space-y-2">
        <Label>Métodos de pago</Label>
        <p className="text-[11px] text-muted-foreground">
          Se listan en la variable <code className="rounded bg-muted px-1 text-[10px]">{"{{metodos_pago}}"}</code> de los mensajes.
        </p>
        <div className="space-y-2">
          {settings.paymentMethods.map((method, index) => (
            <div key={`${method}-${index}`} className="flex items-center gap-2 rounded-xl border p-2">
              <span className="flex-1 text-sm font-medium px-1">{method}</span>
              <Button variant="ghost" size="icon" className="size-8" disabled={index === 0} onClick={() => moveMethod(index, -1)}>
                <ArrowUp className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="size-8" disabled={index === settings.paymentMethods.length - 1} onClick={() => moveMethod(index, 1)}>
                <ArrowDown className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => removeMethod(index)}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newMethod}
            onChange={(e) => setNewMethod(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addMethod()
              }
            }}
            placeholder="Nuevo método (ej: PayPal)"
            className="h-9 text-sm"
          />
          <Button variant="outline" size="sm" onClick={addMethod}>
            <Plus /> Agregar
          </Button>
        </div>
      </div>

      <Button onClick={save} disabled={saving}>
        <Save /> {saving ? "Guardando..." : "Guardar configuración"}
      </Button>
    </div>
  )
}
