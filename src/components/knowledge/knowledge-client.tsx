"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { BookOpen, FileUp, Pencil, Plus, Search, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LoadingState } from "@/components/ui/loading-state"
import { EmptyState } from "@/components/ui/empty-state"
import { Badge } from "@/components/ui/badge"
import { FilterChip } from "@/components/ui/filter-chip"
import { KnowledgeFormModal } from "./knowledge-form-modal"
import { KnowledgeUploadModal } from "./knowledge-upload-modal"
import { KnowledgeDetailModal } from "./knowledge-detail-modal"
import {
  type KnowledgeCategoryItem,
  type KnowledgeDoc,
  type KnowledgeHit,
  type KnowledgeTagItem,
  STATUS_LABELS,
  TYPE_COLORS,
  documentTypeLabel,
} from "./knowledge-types"

type StatusFilter = "published" | "draft" | "archived" | "all"

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "published", label: "Publicados" },
  { value: "draft", label: "Borradores" },
  { value: "archived", label: "Archivados" },
  { value: "all", label: "Todos" },
]

export function KnowledgeClient() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([])
  const [categories, setCategories] = useState<KnowledgeCategoryItem[]>([])
  const [tags, setTags] = useState<KnowledgeTagItem[]>([])
  const [query, setQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("published")
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editing, setEditing] = useState<KnowledgeDoc | null>(null)
  const [detail, setDetail] = useState<KnowledgeDoc | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadMeta = useCallback(async () => {
    const [catRes, tagRes] = await Promise.all([
      fetch("/api/knowledge/categories").then((r) => (r.ok ? r.json() : { categories: [] })),
      fetch("/api/knowledge/tags").then((r) => (r.ok ? r.json() : { tags: [] })),
    ])
    setCategories(catRes.categories ?? [])
    setTags(tagRes.tags ?? [])
  }, [])

  const loadDocs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set("query", query.trim())
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (categoryFilter) params.set("categoryId", categoryFilter)

      let res: Response
      if (query.trim() && statusFilter === "published") {
        params.delete("status")
        res = await fetch(`/api/knowledge/search?${params.toString()}`)
        const data = (await res.json()) as { hits?: KnowledgeHit[] }
        if (!res.ok) throw new Error("Error al buscar")
        setDocs((data.hits ?? []).map((h) => h.document))
      } else {
        res = await fetch(`/api/knowledge?${params.toString()}`)
        const data = (await res.json()) as { items?: KnowledgeDoc[] }
        if (!res.ok) throw new Error("Error al cargar documentos")
        setDocs(data.items ?? [])
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar documentos")
    } finally {
      setLoading(false)
    }
  }, [query, statusFilter, categoryFilter])

  useEffect(() => {
    void loadMeta()
  }, [loadMeta])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => void loadDocs(), 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [loadDocs])

  async function archive(doc: KnowledgeDoc) {
    try {
      const res = await fetch(`/api/knowledge/documents/${doc.id}/archive`, { method: "POST" })
      if (!res.ok) throw new Error("No se pudo archivar")
      toast.success("Documento archivado")
      void loadDocs()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error")
    }
  }

  async function remove(doc: KnowledgeDoc) {
    if (!window.confirm(`¿Eliminar definitivamente "${doc.title}"? Esta acción no se puede deshacer.`)) return
    try {
      const res = await fetch(`/api/knowledge/documents/${doc.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("No se pudo eliminar")
      toast.success("Documento eliminado")
      void loadDocs()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error")
    }
  }

  const selectedCategory = categories.find((c) => c.id === categoryFilter)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar en la Base de Conocimiento..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setUploadOpen(true)} className="gap-1.5">
            <FileUp className="size-4" />
            Subir archivo
          </Button>
          <Button onClick={() => { setEditing(null); setFormOpen(true) }} className="gap-1.5">
            <Plus className="size-4" />
            Nuevo documento
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((s) => (
          <FilterChip key={s.value} label={s.label} active={statusFilter === s.value} onClick={() => setStatusFilter(s.value)} />
        ))}
        <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
        {categories.slice(0, 8).map((c) => (
          <FilterChip
            key={c.id}
            label={c.name}
            active={categoryFilter === c.id}
            onRemove={categoryFilter === c.id ? () => setCategoryFilter(null) : undefined}
            onClick={() => setCategoryFilter(categoryFilter === c.id ? null : c.id)}
          />
        ))}
      </div>

      {selectedCategory && (
        <p className="text-xs text-muted-foreground">
          Filtrando por categoría <span className="font-semibold text-foreground">{selectedCategory.name}</span>
        </p>
      )}

      {loading ? (
        <LoadingState message="Cargando documentos..." />
      ) : docs.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Aún no hay documentos"
          description="Registra políticas, garantías o procedimientos para que Panitas los use al responder."
          action={
            <Button onClick={() => { setEditing(null); setFormOpen(true) }} className="gap-1.5">
              <Plus className="size-4" /> Crear el primer documento
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {docs.map((doc) => (
            <div key={doc.id} className="group flex flex-col rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setDetail(doc)}
                  className="text-left font-heading text-sm font-bold text-foreground hover:text-primary"
                >
                  {doc.title}
                </button>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button type="button" onClick={() => { setEditing(doc); setFormOpen(true) }} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Editar">
                    <Pencil className="size-3.5" />
                  </button>
                  {doc.status !== "archived" && (
                    <button type="button" onClick={() => void archive(doc)} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-amber-600" aria-label="Archivar">
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className={`px-2 py-0.5 text-[10px] font-bold ${TYPE_COLORS[doc.type] ?? "bg-muted text-muted-foreground"}`}>
                  {documentTypeLabel(doc.type)}
                </Badge>
                <Badge variant="outline" className="px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  v{doc.version}
                </Badge>
                <Badge variant="outline" className="px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {STATUS_LABELS[doc.status] ?? doc.status}
                </Badge>
              </div>

              <p className="mt-2 line-clamp-3 flex-1 text-xs leading-relaxed text-muted-foreground">
                {doc.summary || doc.content.slice(0, 220) || doc.fileName}
              </p>

              {doc.categoryNames.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {doc.categoryNames.slice(0, 3).map((name) => (
                    <span key={name} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {name}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
                <span>{doc.viewCount} vistas</span>
                <button type="button" onClick={() => setDetail(doc)} className="font-semibold text-primary hover:underline">
                  Ver documento
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <KnowledgeFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        document={editing}
        categories={categories}
        tags={tags}
        onSaved={() => void loadDocs()}
      />
      <KnowledgeUploadModal open={uploadOpen} onOpenChange={setUploadOpen} categories={categories} tags={tags} onSaved={() => void loadDocs()} />
      <KnowledgeDetailModal
        document={detail}
        onOpenChange={setDetail}
        onEdited={(doc) => {
          setDetail(doc)
          void loadDocs()
        }}
        onArchived={() => {
          setDetail(null)
          void loadDocs()
        }}
      />
    </div>
  )
}
