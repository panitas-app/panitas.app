"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { getAllTemplates, getTemplate } from "@/lib/store/template-registry"
import type { TemplateId } from "@/lib/store/template-types"
import { Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface TemplateSelectorProps {
  storeId: string
  currentTemplate: string
}

const previews: Record<TemplateId, string> = {
  modern: "/templates/modern.jpg",
  express: "/templates/express.jpg",
  delivery: "/templates/delivery.jpg",
  premium: "/templates/premium.jpg",
}

export function TemplateSelector({ storeId, currentTemplate }: TemplateSelectorProps) {
  const [selected, setSelected] = useState(currentTemplate)
  const [saving, setSaving] = useState(false)
  const templates = getAllTemplates()

  async function handleSelect(templateId: TemplateId) {
    if (templateId === selected) return
    setSaving(true)
    setSelected(templateId)
    try {
      const res = await fetch(`/api/store/${storeId}/template`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: templateId }),
      })
      if (!res.ok) throw new Error("Error al guardar")
      toast.success(`Plantilla cambiada a "${getTemplate(templateId).label}"`)
    } catch {
      setSelected(currentTemplate)
      toast.error("No se pudo cambiar la plantilla")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative">
      {saving && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {templates.map((t) => {
          const isActive = selected === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => handleSelect(t.id)}
              disabled={saving}
              className={cn(
                "relative overflow-hidden rounded-lg border-2 p-1 text-left transition-all hover:shadow-md",
                isActive
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-muted-foreground/30"
              )}
            >
              <div className="aspect-video w-full overflow-hidden rounded bg-muted">
                <img
                  src={previews[t.id]}
                  alt={t.label}
                  className="size-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://placehold.co/640x360/eee/999?text=${t.label}`
                  }}
                />
              </div>
              {isActive && (
                <div className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
                  <Check className="size-3.5" />
                </div>
              )}
              <div className="p-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{t.label}</p>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {t.category}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{t.description}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
