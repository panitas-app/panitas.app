"use client"

import { useEffect, useRef, useState } from "react"
import { FileText, Upload } from "lucide-react"
import { toast } from "sonner"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { type KnowledgeCategoryItem, type KnowledgeTagItem } from "./knowledge-types"

interface KnowledgeUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: KnowledgeCategoryItem[]
  tags: KnowledgeTagItem[]
  onSaved: () => void
}

const MAX_SIZE = 10 * 1024 * 1024
const ACCEPTED = ".pdf,.docx,.txt"

export function KnowledgeUploadModal({ open, onOpenChange, categories, tags, onSaved }: KnowledgeUploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [summary, setSummary] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setFile(null)
      setTitle("")
      setSummary("")
      setSelectedCategories([])
    }
  }, [open])

  function pick(file: File | null) {
    if (!file) return
    const ext = file.name.toLowerCase().split(".").pop()
    if (!ext || !ACCEPTED.includes(`.${ext}`)) {
      toast.error("Solo se aceptan archivos PDF, DOCX o TXT")
      return
    }
    if (file.size > MAX_SIZE) {
      toast.error("El archivo supera el máximo de 10MB")
      return
    }
    setFile(file)
    if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ""))
  }

  function toggleCategory(id: string) {
    setSelectedCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  async function submit() {
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("title", title.trim() || file.name.replace(/\.[^.]+$/, ""))
      form.append("type", "pdf")
      form.append("categoryIds", JSON.stringify(selectedCategories))

      const res = await fetch("/api/knowledge/upload", { method: "POST", body: form })
      const data = (await res.json()) as { error?: string; extracted?: boolean }
      if (!res.ok) throw new Error(data.error ?? "Error al subir el archivo")
      toast.success(data.extracted === false ? "Documento subido (no se pudo extraer el texto)" : "Documento subido y procesado")
      onOpenChange(false)
      onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al subir el archivo")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Subir archivo</DialogTitle>
          <DialogDescription>
            Sube un PDF, DOCX o TXT (máx. 10MB). Panitas extrae el texto para indexarlo en la Base de Conocimiento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/40 px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/60"
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <>
                <FileText className="size-8 text-primary" />
                <span className="text-sm font-semibold text-foreground">{file.name}</span>
                <span className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB — haz clic para cambiar</span>
              </>
            ) : (
              <>
                <Upload className="size-8 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Haz clic para elegir un archivo</span>
                <span className="text-xs text-muted-foreground">PDF, DOCX o TXT hasta 10MB</span>
              </>
            )}
          </button>

          <div className="space-y-1.5">
            <Label htmlFor="ku-title">Título (opcional)</Label>
            <Input id="ku-title" placeholder="Nombre del documento" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ku-summary">Resumen (opcional)</Label>
            <Textarea id="ku-summary" rows={2} placeholder="Qué contiene este documento" value={summary} onChange={(e) => setSummary(e.target.value)} />
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
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => void submit()} disabled={!file || uploading}>
            {uploading ? "Subiendo..." : "Subir documento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
