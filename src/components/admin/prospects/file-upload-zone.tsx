"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Trash2,
  Loader2,
  FolderOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ProspectFile {
  id: string
  nombre: string
  url: string
  tipo: string
  size: number | null
  esFoto: boolean
  createdAt: string
}

interface FileUploadZoneProps {
  prospectId: string
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

export function FileUploadZone({ prospectId }: FileUploadZoneProps) {
  const [files, setFiles] = useState<ProspectFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/prospects/${prospectId}/files`)
      if (!res.ok) throw new Error("Error al cargar")
      setFiles(await res.json())
    } catch {
      toast.error("Error al cargar archivos")
    } finally {
      setLoading(false)
    }
  }, [prospectId])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  async function uploadFile(file: File) {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("nombre", file.name)
      formData.append("tipo", file.type)
      formData.append("esFoto", file.type.startsWith("image/") ? "true" : "false")

      const res = await fetch(`/api/admin/prospects/${prospectId}/files`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al subir")
      }

      toast.success("Archivo subido")
      fetchFiles()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir archivo")
    } finally {
      setUploading(false)
    }
  }

  async function deleteFile(file: ProspectFile) {
    if (!confirm(`¿Eliminar "${file.nombre}"?`)) return

    try {
      const res = await fetch(`/api/admin/prospects/${prospectId}/files/${file.id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Error al eliminar")

      toast.success("Archivo eliminado")
      setFiles((prev) => prev.filter((f) => f.id !== file.id))
    } catch {
      toast.error("Error al eliminar archivo")
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave() {
    setDragOver(false)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    e.target.value = ""
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border/50 hover:border-border"
        )}
      >
        <Upload className="size-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Arrastra un archivo aquí
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Upload className="size-3.5" />
          )}
          {uploading ? "Subiendo..." : "Subir archivo"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          onChange={handleFileSelect}
        />
      </div>

      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="rounded-full bg-muted p-3 mb-3">
            <FolderOpen className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Sin archivos</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="group relative flex flex-col overflow-hidden rounded-xl border bg-card/50 transition-colors hover:bg-card"
            >
              <div className="aspect-square flex items-center justify-center bg-muted/30">
                {file.esFoto ? (
                  <img
                    src={file.url}
                    alt={file.nombre}
                    className="size-full object-cover"
                  />
                ) : (
                  <FileText className="size-8 text-muted-foreground/50" />
                )}
              </div>
              <div className="flex flex-col gap-0.5 p-2.5">
                <p className="text-xs font-medium truncate" title={file.nombre}>
                  {file.nombre}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {file.size ? formatFileSize(file.size) : "—"} &middot;{" "}
                    {format(new Date(file.createdAt), "dd/MM/yy")}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteFile(file)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
