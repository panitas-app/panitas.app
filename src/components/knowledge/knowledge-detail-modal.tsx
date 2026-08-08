"use client"

import { useEffect, useState } from "react"
import { ArrowDownToLine, FileText, History, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  type KnowledgeDoc,
  type KnowledgeHistoryItem,
  type KnowledgeVersionItem,
  STATUS_LABELS,
  TYPE_COLORS,
  documentTypeLabel,
} from "./knowledge-types"

interface KnowledgeDetailModalProps {
  document: KnowledgeDoc | null
  onOpenChange: (doc: KnowledgeDoc | null) => void
  onEdited: (doc: KnowledgeDoc) => void
  onArchived: () => void
}

const HISTORY_LABELS: Record<string, string> = {
  created: "Creación",
  updated: "Actualización",
  published: "Publicado",
  archived: "Archivado",
  restored: "Restauración",
  viewed: "Vista",
  deleted: "Eliminación",
}

export function KnowledgeDetailModal({ document, onOpenChange, onEdited, onArchived }: KnowledgeDetailModalProps) {
  const [tab, setTab] = useState("content")
  const [versions, setVersions] = useState<KnowledgeVersionItem[]>([])
  const [history, setHistory] = useState<KnowledgeHistoryItem[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [restoring, setRestoring] = useState(false)

  useEffect(() => {
    if (!document) return
    setTab("content")
    setVersions([])
    setHistory([])
    void fetch(`/api/knowledge/documents/${document.id}/view`, { method: "POST" }).catch(() => undefined)
    setLoadingVersions(true)
    void Promise.all([
      fetch(`/api/knowledge/documents/${document.id}/versions`).then((r) => (r.ok ? r.json() : { versions: [] })),
      fetch(`/api/knowledge/documents/${document.id}/history`).then((r) => (r.ok ? r.json() : { history: [] })),
    ]).then(([v, h]) => {
      setVersions(v.versions ?? [])
      setHistory(h.history ?? [])
    }).finally(() => setLoadingVersions(false))
  }, [document])

  if (!document) return null
  const doc = document

  async function archive() {
    try {
      const res = await fetch(`/api/knowledge/documents/${doc.id}/archive`, { method: "POST" })
      if (!res.ok) throw new Error("No se pudo archivar")
      toast.success("Documento archivado")
      onArchived()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error")
    }
  }

  async function unarchive() {
    try {
      const res = await fetch(`/api/knowledge/documents/${doc.id}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: doc.version }),
      })
      if (!res.ok) throw new Error("No se pudo restaurar")
      const data = (await res.json()) as { document?: KnowledgeDoc }
      if (data.document) {
        toast.success("Documento publicado")
        onEdited(data.document)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error")
    }
  }

  async function remove() {
    if (!window.confirm(`¿Eliminar definitivamente "${doc.title}"? Esta acción no se puede deshacer.`)) return
    try {
      const res = await fetch(`/api/knowledge/documents/${doc.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("No se pudo eliminar")
      toast.success("Documento eliminado")
      onArchived()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error")
    }
  }

  async function restoreVersion(version: number) {
    setRestoring(true)
    try {
      const res = await fetch(`/api/knowledge/documents/${doc.id}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version }),
      })
      if (!res.ok) throw new Error("No se pudo restaurar la versión")
      const data = (await res.json()) as { document?: KnowledgeDoc }
      toast.success(`Versión ${version} restaurada`)
      if (data.document) onEdited(data.document)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error")
    } finally {
      setRestoring(false)
    }
  }

  return (
    <Dialog open={Boolean(document)} onOpenChange={(open) => { if (!open) onOpenChange(null) }}>
      <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className={`px-2 py-0.5 text-[10px] font-bold ${TYPE_COLORS[document.type] ?? "bg-muted text-muted-foreground"}`}>
              {documentTypeLabel(document.type)}
            </Badge>
            <Badge variant="outline" className="px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">v{document.version}</Badge>
            <Badge variant="outline" className="px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {STATUS_LABELS[document.status] ?? document.status}
            </Badge>
          </div>
          <DialogTitle className="mt-2">{document.title}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{document.authorName ?? "Autor desconocido"}</span>
            <span>· {new Date(document.createdAt).toLocaleDateString("es-VE")}</span>
            <span>· actualizado {new Date(document.updatedAt).toLocaleDateString("es-VE")}</span>
            <span>· {document.viewCount} vistas</span>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-border py-2">
            <TabsList>
              <TabsTrigger value="content">Contenido</TabsTrigger>
              <TabsTrigger value="versions">Versiones ({versions.length})</TabsTrigger>
              <TabsTrigger value="history">Historial ({history.length})</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              {document.status === "archived" ? (
                <Button size="sm" variant="outline" onClick={() => void unarchive()}>Publicar</Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => void archive()}>Archivar</Button>
              )}
              <Button size="sm" variant="outline" onClick={() => onOpenChange(null)} className="gap-1.5">
                <ArrowDownToLine className="size-4" />
                Cerrar
              </Button>
              <Button size="sm" variant="destructive" onClick={() => void remove()} className="gap-1.5">
                <Trash2 className="size-4" />
                Eliminar
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            <TabsContent value="content" className="space-y-4">
              {document.summary && (
                <p className="rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Resumen: </span>
                  {document.summary}
                </p>
              )}

              {document.fileName && (
                <a
                  href={document.fileUrl ?? "#"}
                  target={document.fileUrl ? "_blank" : undefined}
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-sm text-foreground transition-colors hover:border-primary/50"
                >
                  <FileText className="size-4 text-primary" />
                  {document.fileName}
                  <span className="text-xs text-muted-foreground">
                    {document.fileSize ? `${(document.fileSize / 1024).toFixed(0)} KB` : document.fileType ?? ""}
                  </span>
                </a>
              )}

              <div className="whitespace-pre-wrap rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-foreground">
                {document.content.trim() || <span className="text-muted-foreground">Sin contenido textual extraído.</span>}
              </div>

              {(document.categoryNames.length > 0 || document.tagNames.length > 0) && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {document.categoryNames.map((name) => (
                    <span key={`c-${name}`} className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">{name}</span>
                  ))}
                  {document.tagNames.map((name) => (
                    <span key={`t-${name}`} className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-primary">#{name}</span>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="versions" className="space-y-2">
              {loadingVersions ? (
                <p className="text-sm text-muted-foreground">Cargando versiones...</p>
              ) : versions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin versiones registradas.</p>
              ) : (
                versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Versión {v.version}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(v.createdAt).toLocaleString("es-VE")}
                        {v.changeNote ? ` — ${v.changeNote}` : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={v.version === document.version || restoring}
                      onClick={() => void restoreVersion(v.version)}
                    >
                      {v.version === document.version ? "Actual" : "Restaurar"}
                    </Button>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-2">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin actividad registrada.</p>
              ) : (
                history.map((h) => (
                  <div key={h.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
                    <History className="size-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{HISTORY_LABELS[h.action] ?? h.action}</p>
                      {h.metadata && Object.keys(h.metadata).length > 0 && (
                        <p className="text-xs text-muted-foreground">{JSON.stringify(h.metadata)}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleString("es-VE")}</span>
                  </div>
                ))
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
