"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  type KnowledgeCategoryItem,
  type KnowledgeDoc,
  type KnowledgeTagItem,
  DOCUMENT_TYPES,
  STATUS_LABELS,
  documentTypeLabel,
} from "./knowledge-types"

interface KnowledgeFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: KnowledgeDoc | null
  categories: KnowledgeCategoryItem[]
  tags: KnowledgeTagItem[]
  onSaved: () => void
}

export function KnowledgeFormModal({ open, onOpenChange, document, categories, tags, onSaved }: KnowledgeFormModalProps) {
  const editing = Boolean(document)

  const [title, setTitle] = useState("")
  const [type, setType] = useState("policy")
  const [status, setStatus] = useState("published")
  const [summary, setSummary] = useState("")
  const [content, setContent] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [changeNote, setChangeNote] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(document?.title ?? "")
    setType(document?.type ?? "policy")
    setStatus(document?.status ?? "published")
    setSummary(document?.summary ?? "")
    setContent(document?.content ?? "")
    setSelectedCategories(document?.categoryIds ?? [])
    setSelectedTags(document?.tagIds ?? [])
    setNewTag("")
    setChangeNote("")
  }, [open, document])

  const valid = title.trim().length > 0 && content.trim().length > 0

  async function ensureNewTags(): Promise<string[]> {
    const pending = newTag
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    if (pending.length === 0) return selectedTags

    const ids = [...selectedTags]
    for (const name of pending) {
      const existing = tags.find((t) => t.name.toLowerCase() === name.toLowerCase())
      if (existing) {
        if (!ids.includes(existing.id)) ids.push(existing.id)
        continue
      }
      try {
        const res = await fetch("/api/knowledge/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        })
        if (!res.ok) throw new Error(`No se pudo crear la etiqueta "${name}"`)
        const data = (await res.json()) as { tag?: { id: string } }
        if (data.tag?.id && !ids.includes(data.tag.id)) ids.push(data.tag.id)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error al crear etiqueta")
      }
    }
    return ids
  }

  async function submit() {
    if (!valid) return
    setSaving(true)
    try {
      const tagIds = await ensureNewTags()
      const url = editing ? `/api/knowledge/documents/${document!.id}` : "/api/knowledge"
      const body: Record<string, unknown> = {
        title: title.trim(),
        type,
        status,
        summary: summary.trim() || undefined,
        content: content.trim(),
        categoryIds: selectedCategories,
        tagIds,
      }
      if (editing && changeNote.trim()) body.changeNote = changeNote.trim()

      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || (editing ? "Error al actualizar el documento" : "Error al crear el documento"))
      }
      toast.success(editing ? "Documento actualizado" : "Documento creado")
      onOpenChange(false)
      onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar el documento")
    } finally {
      setSaving(false)
    }
  }

  function toggleCategory(id: string) {
    setSelectedCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  function toggleTag(id: string) {
    setSelectedTags((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar documento" : "Nuevo documento"}</DialogTitle>
          <DialogDescription>
            {editing
              ? `Actualiza "${document!.title}" (v${document!.version}). Al guardar se crea una versión nueva.`
              : "Registra políticas, garantías o procedimientos para la Base de Conocimiento."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="kf-title">Título *</Label>
              <Input id="kf-title" placeholder="Ej: Política de garantías" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kf-type">Tipo</Label>
              <select
                id="kf-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="kf-status">Estado</Label>
              <select
                id="kf-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kf-summary">Resumen (opcional)</Label>
              <Input id="kf-summary" placeholder="Qué cubre este documento" value={summary} onChange={(e) => setSummary(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kf-content">Contenido *</Label>
            <Textarea id="kf-content" rows={8} placeholder="Escribe el contenido del documento..." value={content} onChange={(e) => setContent(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Categorías</Label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCategory(c.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    selectedCategories.includes(c.id)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {c.name}
                </button>
              ))}
              {categories.length === 0 && <span className="text-xs text-muted-foreground">Sin categorías disponibles.</span>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Etiquetas</Label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTag(t.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    selectedTags.includes(t.id)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  #{t.name}
                </button>
              ))}
              <span className="text-xs text-muted-foreground">Selecciona etiquetas o crea nuevas:</span>
            </div>
            <Input placeholder="Nueva etiqueta (separada por comas)" value={newTag} onChange={(e) => setNewTag(e.target.value)} />
          </div>

          {editing && (
            <div className="space-y-1.5">
              <Label htmlFor="kf-note">Nota de cambio (opcional)</Label>
              <Input id="kf-note" placeholder="Ej: Actualizada fecha de garantía" value={changeNote} onChange={(e) => setChangeNote(e.target.value)} />
            </div>
          )}

          {editing && document?.fileName && (
            <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Archivo adjunto: <span className="font-semibold text-foreground">{document.fileName}</span> — el texto extraído se mantiene al editar.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => void submit()} disabled={!valid || saving}>
            {saving ? "Guardando..." : editing ? `Guardar cambios (v${(document?.version ?? 0) + 1})` : `Crear como ${documentTypeLabel(type)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
