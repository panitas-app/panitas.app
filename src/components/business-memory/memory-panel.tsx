"use client"

import { useCallback, useEffect, useState } from "react"
import { Brain, Pencil, Trash2, RotateCcw, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { EmptyState } from "@/components/ui/empty-state"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { BusinessMemoryItem } from "@/lib/business-memory"
import {
  buildPanelModel,
  memoryDescription,
  memoryStatusLabel,
} from "@/lib/business-memory/memory-ui"

type MemoryStats = { total: number; confirmed: number; candidates: number }

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? "Error de servidor")
  }
  return res.json()
}

function strengthOf(item: BusinessMemoryItem): string {
  return `${item.metadata.strength}/${item.metadata.threshold}`
}

export function MemoryPanel() {
  const [memories, setMemories] = useState<BusinessMemoryItem[]>([])
  const [, setStats] = useState<MemoryStats>({ total: 0, confirmed: 0, candidates: 0 })
  const [learningEnabled, setLearningEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [editTarget, setEditTarget] = useState<BusinessMemoryItem | null>(null)
  const [editLabel, setEditLabel] = useState("")
  const [editValue, setEditValue] = useState("")
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api("/api/business-memory")
      setMemories(data.memories ?? [])
      setStats(data.stats ?? { total: 0, confirmed: 0, candidates: 0 })
      setLearningEnabled(data.learningEnabled !== false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar la memoria")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const model = buildPanelModel(memories, learningEnabled)

  async function toggleLearning(enabled: boolean) {
    setToggling(true)
    try {
      await api("/api/business-memory/learning", {
        method: "POST",
        body: JSON.stringify({ enabled }),
      })
      setLearningEnabled(enabled)
      toast.success(enabled ? "Aprendizaje automático activado" : "Aprendizaje automático desactivado")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar el aprendizaje")
    } finally {
      setToggling(false)
    }
  }

  function openEdit(item: BusinessMemoryItem) {
    setEditTarget(item)
    setEditLabel(item.label)
    setEditValue(JSON.stringify(item.value ?? "", null, 2))
  }

  async function saveEdit() {
    if (!editTarget) return
    let value: unknown = editValue
    try {
      value = JSON.parse(editValue)
    } catch {
      toast.error("El valor debe ser JSON válido")
      return
    }
    try {
      const data = await api("/api/business-memory", {
        method: "PATCH",
        body: JSON.stringify({ key: editTarget.key, label: editLabel, value }),
      })
      const updated = data.memory as BusinessMemoryItem
      setMemories((prev) => prev.map((m) => (m.key === updated.key ? updated : m)))
      setEditTarget(null)
      toast.success("Recuerdo actualizado")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar")
    }
  }

  async function removeMemory(item: BusinessMemoryItem) {
    try {
      await api(`/api/business-memory?key=${encodeURIComponent(item.key)}`, { method: "DELETE" })
      setMemories((prev) => prev.filter((m) => m.key !== item.key))
      toast.success("Recuerdo eliminado")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar")
    }
  }

  async function resetMemory() {
    setResetting(true)
    try {
      const data = await api("/api/business-memory/reset", { method: "POST" })
      setConfirmReset(false)
      await load()
      toast.success(`${data.removed ?? 0} recuerdos restablecidos`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo restablecer")
    } finally {
      setResetting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" /> Cargando memoria del negocio…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Encabezado + control de aprendizaje */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-background/70 p-5 shadow-sm sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Brain className="size-5" />
          </div>
          <div>
            <h1 className="font-heading text-base font-bold">Memoria del negocio</h1>
            <p className="text-xs text-muted-foreground">
              Lo que el asistente recuerda de cómo trabajas
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 sm:ml-auto">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={learningEnabled} disabled={toggling} onCheckedChange={toggleLearning} />
            Aprendizaje automático
          </label>
          <Button
            variant="outline"
            size="sm"
            disabled={resetting}
            onClick={() => setConfirmReset(true)}
          >
            <RotateCcw className="size-3.5" /> Restablecer
          </Button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Recuerdos" value={model.total} />
        <StatCard label="Confirmados" value={model.confirmed} />
        <StatCard label="En aprendizaje" value={model.candidates} />
        <StatCard label="Estado" value={learningEnabled ? "Activo" : "Desactivado"} />
      </div>

      {/* Grupos por tipo */}
      {model.groups.length === 0 ? (
        <EmptyState
          icon={Brain}
          title="Sin memorias todavía"
          description="El asistente irá aprendiendo cómo trabajas mientras conversan. También puedes enseñarle directamente: por ejemplo «llamo clientes a mis pacientes» o «no vender sin stock»."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {model.groups.map((group) => (
            <Card key={group.kind} className="border-border/60 bg-background/70 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold">{group.label}</CardTitle>
                  <Badge variant="secondary">{group.memories.length}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{group.description}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {group.memories.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-start gap-3 rounded-xl border border-border/60 bg-background p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{memoryDescription(item)}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Badge variant={item.status === "confirmed" ? "default" : "outline"}>
                          {memoryStatusLabel(item.status)}
                        </Badge>
                        {item.status === "candidate" && (
                          <span>Fuerza {strengthOf(item)}</span>
                        )}
                        <span>
                          {format(new Date(item.updatedAt), "d MMM yyyy", { locale: es })}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(item)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive"
                        onClick={() => removeMemory(item)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Diálogo de edición */}
      <Dialog open={Boolean(editTarget)} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar recuerdo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="mem-label">Etiqueta</Label>
              <Input id="mem-label" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mem-value">Valor (JSON)</Label>
              <Textarea
                id="mem-value"
                rows={5}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={saveEdit}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de restablecer */}
      <Dialog open={confirmReset} onOpenChange={(open) => !open && setConfirmReset(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restablecer memoria del negocio</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Se eliminarán todos los recuerdos aprendidos (terminología, preferencias, reglas y
            patrones). La configuración del aprendizaje automático se conserva. Esta acción no se
            puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={resetMemory} disabled={resetting}>
              {resetting && <Loader2 className="size-4 animate-spin" />} Restablecer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-2xl font-bold">{value}</p>
    </div>
  )
}
