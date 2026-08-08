"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Plus, RotateCcw, WandSparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  LEVEL_META,
  TEMPLATE_VARIABLES,
  money,
  formatDate,
  type CollectionCategory,
  type CollectionLevel,
  type CollectionTemplate,
} from "./collection-types"

const SAMPLE_VALUES: Record<string, string | number> = {
  cliente: "María González",
  saldo: money(150.0),
  monto_abono: money(50.0),
  fecha_vencimiento: formatDate(new Date(Date.now() + 5 * 86400000).toISOString()),
  dias_atraso: 6,
  metodos_pago: "Zelle, Pago Móvil",
  nombre_negocio: "Mi Negocio",
}

export function renderPreview(body: string): string {
  return body.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (match, key: string) => {
    const value = SAMPLE_VALUES[key]
    return value === undefined || value === null ? match : String(value)
  })
}

const LEVELS: CollectionLevel[] = [1, 2, 3]

export function TemplateEditor() {
  const [templates, setTemplates] = useState<CollectionTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/collection/templates")
      if (!res.ok) throw new Error("Error al cargar plantillas")
      const data = await res.json()
      setTemplates(data.templates)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar plantillas")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  function update(id: string, patch: Partial<CollectionTemplate>) {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  async function saveTemplate(template: CollectionTemplate) {
    setSavingId(template.id)
    try {
      const res = await fetch("/api/collection/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: template.id,
          category: template.category,
          name: template.name,
          level: template.level,
          body: template.body,
          isActive: template.isActive,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al guardar la plantilla")
      }
      const data = await res.json()
      setTemplates((prev) => prev.map((t) => (t.id === data.template.id ? data.template : t)))
      toast.success("Plantilla guardada")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar la plantilla")
    } finally {
      setSavingId(null)
    }
  }

  async function addTemplate(category: CollectionCategory) {
    try {
      const res = await fetch("/api/collection/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          name: "Plantilla personalizada",
          level: CATEGORY_META[category].level,
          body: "Hola {{cliente}}, {{nombre_negocio}} le recuerda su saldo pendiente de {{saldo}}.",
        }),
      })
      if (!res.ok) throw new Error("Error al crear la plantilla")
      const data = await res.json()
      setTemplates((prev) => [...prev, data.template])
      toast.success("Plantilla creada")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear la plantilla")
    }
  }

  async function restoreDefaults() {
    setRestoring(true)
    try {
      const res = await fetch("/api/collection/templates/restore", { method: "POST" })
      if (!res.ok) throw new Error("Error al restaurar")
      const data = await res.json()
      setTemplates(data.templates)
      toast.success("Plantillas restauradas")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al restaurar plantillas")
    } finally {
      setRestoring(false)
    }
  }

  if (loading) {
    return <p className="text-xs text-muted-foreground py-10 text-center">Cargando plantillas...</p>
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground max-w-md">
          Edita los mensajes de cobranza por categoría. Usa las variables <code className="rounded bg-muted px-1 py-0.5 text-[10px]">{"{{variable}}"}</code> para
          personalizar cada mensaje automáticamente.
        </p>
        <Button variant="outline" size="sm" onClick={restoreDefaults} disabled={restoring}>
          <RotateCcw /> {restoring ? "Restaurando..." : "Restaurar por defecto"}
        </Button>
      </div>

      <div className="rounded-xl border bg-muted/40 p-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Variables disponibles</p>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATE_VARIABLES.map((v) => (
            <span key={v.key} title={v.description} className="rounded-lg border bg-background px-2 py-1 text-[11px] text-muted-foreground">
              <code className="font-semibold text-foreground">{"{{" + v.key + "}}"}</code>
            </span>
          ))}
        </div>
      </div>

      {CATEGORY_ORDER.map((category) => {
        const meta = CATEGORY_META[category]
        const items = templates.filter((t) => t.category === category)
        if (items.length === 0) return null
        return (
          <section key={category} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-sm font-extrabold flex items-center gap-2">
                  <span className={`size-2 rounded-full ${LEVEL_META[meta.level].dot}`} />
                  {meta.label}
                </h3>
                <p className="text-[11px] text-muted-foreground">{meta.description}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => addTemplate(category)}>
                <Plus /> Nueva
              </Button>
            </div>

            {items.map((template) => (
              <div key={template.id} className="rounded-xl border p-3 space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    value={template.name}
                    onChange={(e) => update(template.id, { name: e.target.value })}
                    className="h-9 text-sm font-semibold sm:max-w-xs"
                  />
                  <div className="flex items-center gap-2">
                    <Select
                      value={String(template.level)}
                      onValueChange={(v) => update(template.id, { level: Number(v) as CollectionLevel })}
                    >
                      <SelectTrigger size="sm" className="w-40">
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
                    {template.isBuiltIn && (
                      <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                        Por defecto
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="space-y-1.5">
                    <Textarea
                      value={template.body}
                      onChange={(e) => update(template.id, { body: e.target.value })}
                      rows={5}
                      className="text-xs leading-relaxed"
                    />
                    <p className="text-[10px] text-muted-foreground">{template.body.length} caracteres</p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="rounded-xl border bg-muted/40 p-3 text-xs leading-relaxed whitespace-pre-wrap">
                      {renderPreview(template.body)}
                    </div>
                    <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                      <WandSparkles className="size-3" /> Vista previa con datos de ejemplo
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    disabled={savingId === template.id}
                    onClick={() => saveTemplate(template)}
                  >
                    {savingId === template.id ? <span className="flex items-center gap-1.5">Guardando...</span> : <span className="flex items-center gap-1.5"><Check /> Guardar</span>}
                  </Button>
                </div>
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}
