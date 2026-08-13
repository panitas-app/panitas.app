"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ATTENTION_TYPES,
  type AttentionPriority,
  type AttentionType,
} from "@/lib/attention/types"
import { attentionPluralLabel } from "@/lib/attention/rules"

interface AttentionPreferences {
  enabledTypes: AttentionType[]
  minPriority: AttentionPriority
  quietHoursStart: string | null
  quietHoursEnd: string | null
}

const DEFAULT_PREFS: AttentionPreferences = {
  enabledTypes: [...ATTENTION_TYPES],
  minPriority: "low",
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
}

const PRIORITY_OPTIONS: { value: AttentionPriority; label: string; hint: string }[] = [
  { value: "low", label: "Todo", hint: "Recibe todas las situaciones" },
  { value: "medium", label: "Media y superior", hint: "Evita las de prioridad baja" },
  { value: "high", label: "Alta y crítica", hint: "Solo lo urgente" },
  { value: "critical", label: "Solo críticas", hint: "Acción inmediata" },
]

const DOMAINS: { key: string; label: string; types: AttentionType[] }[] = [
  { key: "inventory", label: "Inventario", types: ATTENTION_TYPES.filter((t) => t.startsWith("inventory.")) },
  { key: "credits", label: "Créditos", types: ATTENTION_TYPES.filter((t) => t.startsWith("credit.")) },
  { key: "suppliers", label: "Proveedores", types: ATTENTION_TYPES.filter((t) => t.startsWith("supplier.")) },
  { key: "orders", label: "Pedidos", types: ATTENTION_TYPES.filter((t) => t.startsWith("order.")) },
  { key: "conversations", label: "Mensajes", types: ATTENTION_TYPES.filter((t) => t.startsWith("conversation.")) },
  { key: "channels", label: "Canales", types: ATTENTION_TYPES.filter((t) => t.startsWith("channel.")) },
]

export function AttentionSettingsDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [prefs, setPrefs] = useState<AttentionPreferences>(DEFAULT_PREFS)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/attention/settings")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "No se pudieron cargar las preferencias")
      setPrefs(data.preferences)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  const toggleType = (type: AttentionType) => {
    setPrefs((prev) => ({
      ...prev,
      enabledTypes: prev.enabledTypes.includes(type)
        ? prev.enabledTypes.filter((t) => t !== type)
        : [...prev.enabledTypes, type],
    }))
  }

  const toggleDomain = (types: AttentionType[]) => {
    setPrefs((prev) => {
      const allEnabled = types.every((t) => prev.enabledTypes.includes(t))
      return {
        ...prev,
        enabledTypes: allEnabled
          ? prev.enabledTypes.filter((t) => !types.includes(t))
          : [...new Set([...prev.enabledTypes, ...types])],
      }
    })
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/attention/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabledTypes: prefs.enabledTypes,
          minPriority: prefs.minPriority,
          quietHoursStart: prefs.quietHoursStart,
          quietHoursEnd: prefs.quietHoursEnd,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "No se pudieron guardar las preferencias")
      setPrefs(data.preferences)
      onSaved()
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Preferencias de atención</DialogTitle>
          <DialogDescription>
            Controla qué situaciones quieres que Panitas detecte para tu negocio.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {error ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
            ) : null}

            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Prioridad mínima
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {PRIORITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPrefs((prev) => ({ ...prev, minPriority: opt.value }))}
                    className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                      prefs.minPriority === opt.value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <p className="text-xs font-semibold text-foreground">{opt.label}</p>
                    <p className="text-[11px] text-muted-foreground">{opt.hint}</p>
                  </button>
                ))}
              </div>
            </div>

            <ScrollArea className="h-64 rounded-lg border border-border/70">
              <div className="space-y-4 p-3">
                {DOMAINS.map((domain) => (
                  <div key={domain.key}>
                    <div className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5">
                      <p className="text-xs font-bold text-foreground">{domain.label}</p>
                      <Switch
                        checked={domain.types.every((t) => prefs.enabledTypes.includes(t))}
                        onCheckedChange={() => toggleDomain(domain.types)}
                      />
                    </div>
                    <div className="mt-1.5 space-y-1">
                      {domain.types.map((type) => (
                        <label
                          key={type}
                          className="flex cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 transition-colors hover:bg-muted/40"
                        >
                          <span className="text-xs text-muted-foreground">{attentionPluralLabel(type)}</span>
                          <Switch
                            checked={prefs.enabledTypes.includes(type)}
                            onCheckedChange={() => toggleType(type)}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="quiet-start" className="text-xs text-muted-foreground">
                  Inicio horario de silencio
                </Label>
                <Input
                  id="quiet-start"
                  type="time"
                  value={prefs.quietHoursStart ?? ""}
                  onChange={(e) =>
                    setPrefs((prev) => ({ ...prev, quietHoursStart: e.target.value || null }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="quiet-end" className="text-xs text-muted-foreground">
                  Fin horario de silencio
                </Label>
                <Input
                  id="quiet-end"
                  type="time"
                  value={prefs.quietHoursEnd ?? ""}
                  onChange={(e) =>
                    setPrefs((prev) => ({ ...prev, quietHoursEnd: e.target.value || null }))
                  }
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              El horario de silencio aplica a notificaciones externas (email, WhatsApp, push) que se habilitarán en próximas versiones.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={loading || saving} className="gap-1.5">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
