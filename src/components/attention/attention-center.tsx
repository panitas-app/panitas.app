"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  Bell,
  BellRing,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  MessageSquareText,
  Settings2,
  Sparkles,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAssistant } from "@/components/assistant/assistant-provider"
import { AttentionSettingsDialog } from "./attention-settings-dialog"
import type { AttentionGroup, AttentionItemDTO, AttentionOverview } from "@/lib/attention/types"

type TabKey = "pending" | "important" | "snoozed" | "resolved"

const TABS: { key: TabKey; label: string }[] = [
  { key: "pending", label: "Pendientes" },
  { key: "important", label: "Importantes" },
  { key: "snoozed", label: "Pospuestas" },
  { key: "resolved", label: "Resueltas" },
]

function priorityClasses(priority: string): string {
  switch (priority) {
    case "critical":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400"
    case "high":
      return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400"
    case "medium":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400"
    default:
      return "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-900/50 dark:text-gray-400"
  }
}

function priorityLabel(priority: string): string {
  switch (priority) {
    case "critical":
      return "Crítica"
    case "high":
      return "Alta"
    case "medium":
      return "Media"
    default:
      return "Baja"
  }
}

interface ItemCardProps {
  item: AttentionItemDTO
  onResolve: (id: string) => void
  onAcknowledge: (id: string) => void
  onDismiss: (id: string) => void
  onSnooze: (id: string, minutes: number) => void
  onAsk: (item: AttentionItemDTO) => void
}

function ItemCard({ item, onResolve, onAcknowledge, onDismiss, onSnooze, onAsk }: ItemCardProps) {
  return (
    <div className="rounded-lg border border-border/70 bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{item.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
        </div>
        <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", priorityClasses(item.priority))}>
          {priorityLabel(item.priority)}
        </span>
      </div>

      {item.recommendation ? (
        <p className="mt-2 flex items-start gap-1.5 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <span>{item.recommendation}</span>
        </p>
      ) : null}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {item.action ? (
          <Link
            href={item.action.href}
            target={item.action.external ? "_blank" : undefined}
            className="inline-flex h-7 items-center gap-1 rounded-md bg-primary/10 px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            {item.action.label}
          </Link>
        ) : null}
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => onResolve(item.id)}>
          <Check className="size-3.5" /> Resolver
        </Button>
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => onSnooze(item.id, 60)}>
          <CalendarClock className="size-3.5" /> Posponer
        </Button>
        {item.status === "new" ? (
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => onAcknowledge(item.id)}>
            <Eye className="size-3.5" /> Visto
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-muted-foreground hover:text-destructive" onClick={() => onDismiss(item.id)}>
          <X className="size-3.5" /> Descartar
        </Button>
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => onAsk(item)}>
          <MessageSquareText className="size-3.5" /> Preguntar
        </Button>
      </div>
    </div>
  )
}

export function AttentionCenter() {
  const { openAssistant } = useAssistant()
  const [tab, setTab] = useState<TabKey>("pending")
  const [groups, setGroups] = useState<AttentionGroup[]>([])
  const [overview, setOverview] = useState<AttentionOverview | null>(null)
  const [resolved, setResolved] = useState<AttentionItemDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confirmDismiss, setConfirmDismiss] = useState<AttentionItemDTO | null>(null)
  const [snoozeTarget, setSnoozeTarget] = useState<AttentionItemDTO | null>(null)
  const [snoozeMinutes, setSnoozeMinutes] = useState<number>(60)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [openRes, doneRes] = await Promise.all([
        fetch("/api/attention?grouped=true&status=open"),
        fetch("/api/attention?status=resolved"),
      ])
      const [openData, doneData] = await Promise.all([openRes.json(), doneRes.json()])
      if (!openRes.ok || !doneRes.ok) {
        throw new Error(openData.error || doneData.error || "Error al cargar las situaciones")
      }
      setGroups(openData.groups ?? [])
      setOverview(openData.overview ?? null)
      setResolved(doneData.items ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const visible = useMemo(() => {
    if (tab === "resolved") {
      return resolved.filter((item) => item.status === "resolved")
    }
    if (tab === "snoozed") {
      return groups.flatMap((g) => g.items).filter((item) => item.status === "snoozed")
    }
    if (tab === "important") {
      return groups.flatMap((g) => g.items).filter((item) => item.priority === "critical" || item.priority === "high")
    }
    return groups.flatMap((g) => g.items).filter((item) => item.status !== "snoozed")
  }, [tab, groups, resolved])

  const act = useCallback(
    async (itemId: string, action: "resolve" | "dismiss" | "acknowledge" | "snooze", snoozeUntil?: string) => {
      try {
        const res = await fetch("/api/attention", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, itemId, snoozeUntil }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "No se pudo realizar la acción")
        setConfirmDismiss(null)
        setSnoozeTarget(null)
        await load()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    },
    [load],
  )

  const totalOpen = overview?.open ?? 0
  const criticalCount = overview?.critical ?? 0
  const highCount = overview?.high ?? 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
            <Bell className="size-5 text-primary" />
            Centro de Atención
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {totalOpen === 0
              ? "No hay situaciones que requieran atención. Panitas filtra el ruido por ti."
              : `Tu negocio tiene ${totalOpen} ${totalOpen === 1 ? "situación" : "situaciones"} que requieren atención.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && <Badge variant="destructive">{criticalCount} críticas</Badge>}
          {highCount > 0 && <Badge variant="secondary">{highCount} altas</Badge>}
          <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => openAssistant("¿Qué situaciones requieren mi atención ahora mismo?")}>
            <MessageSquareText className="size-4" /> Preguntar a Panitas
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setSettingsOpen(true)}>
            <Settings2 className="size-4" /> Preferencias
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="border-destructive/40 p-4 text-sm text-destructive">{error}</Card>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-colors",
              tab === t.key
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )}
          >
            {t.label}
            {t.key === "pending" && totalOpen > 0 ? (
              <span className="rounded-full bg-background/20 px-1.5 text-[10px]">{totalOpen}</span>
            ) : null}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-24 w-full animate-pulse rounded-xl bg-muted" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-muted" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-muted" />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={BellRing}
          title={tab === "resolved" ? "Aún no hay situaciones resueltas" : "Todo al día"}
          description={
            tab === "resolved"
              ? "Cuando resuelvas situaciones, aparecerán aquí."
              : "Panitas no encontró situaciones que requieran atención en este momento."
          }
        />
      ) : tab === "resolved" ? (
        <div className="grid gap-2 md:grid-cols-2">
          {visible.map((item) => (
            <ItemCard key={item.id} item={item} onResolve={() => {}} onAcknowledge={() => {}} onDismiss={() => {}} onSnooze={() => {}} onAsk={() => openAssistant(item.title)} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {groups
            .filter((g) => g.items.some((i) => (tab === "important" ? i.priority === "critical" || i.priority === "high" : tab === "snoozed" ? i.status === "snoozed" : i.status !== "snoozed")))
            .map((group) => {
              const items = group.items.filter((i) =>
                tab === "important" ? i.priority === "critical" || i.priority === "high" : tab === "snoozed" ? i.status === "snoozed" : i.status !== "snoozed",
              )
              if (items.length === 0) return null
              const isOpen = expanded.has(group.type)
              return (
                <Card key={group.type} className="overflow-hidden">
                  <button
                    onClick={() =>
                      setExpanded((prev) => {
                        const next = new Set(prev)
                        if (next.has(group.type)) next.delete(group.type)
                        else next.add(group.type)
                        return next
                      })
                    }
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                  >
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", group.priority === "critical" || group.priority === "high" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
                      <AlertTriangle className="size-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {group.count} {group.count === 1 ? group.label.replace(/s$/, "") : group.label}
                      </p>
                      <p className="text-xs text-muted-foreground">Prioridad {priorityLabel(group.priority).toLowerCase()}</p>
                    </div>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", priorityClasses(group.priority))}>
                      {priorityLabel(group.priority)}
                    </span>
                    {isOpen ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                  </button>
                  {isOpen && (
                    <div className="space-y-2 border-t border-border/60 p-3">
                      {items.map((item) => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          onResolve={(id) => void act(id, "resolve")}
                          onAcknowledge={(id) => void act(id, "acknowledge")}
                          onDismiss={(id) => setConfirmDismiss(items.find((i) => i.id === id) ?? null)}
                          onSnooze={(id) => {
                            const target = items.find((i) => i.id === id)
                            if (target) {
                              setSnoozeTarget(target)
                              setSnoozeMinutes(60)
                            }
                          }}
                          onAsk={(it) => openAssistant(it.title)}
                        />
                      ))}
                    </div>
                  )}
                </Card>
              )
            })}
        </div>
      )}

      {snoozeTarget ? (
        <Dialog open onOpenChange={(open) => !open && setSnoozeTarget(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Posponer situación</DialogTitle>
              <DialogDescription>{snoozeTarget.title}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={snoozeMinutes === 60 ? "default" : "outline"}
                size="sm"
                onClick={() => setSnoozeMinutes(60)}
              >
                1 hora
              </Button>
              <Button
                variant={snoozeMinutes === 60 * 24 ? "default" : "outline"}
                size="sm"
                onClick={() => setSnoozeMinutes(60 * 24)}
              >
                Mañana
              </Button>
              <Button
                variant={snoozeMinutes === 60 * 24 * 7 ? "default" : "outline"}
                size="sm"
                onClick={() => setSnoozeMinutes(60 * 24 * 7)}
              >
                Semana
              </Button>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setSnoozeTarget(null)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  const until = new Date(Date.now() + snoozeMinutes * 60 * 1000).toISOString()
                  void act(snoozeTarget.id, "snooze", until)
                }}
              >
                Posponer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      {confirmDismiss ? (
        <Dialog open onOpenChange={(open) => !open && setConfirmDismiss(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>¿Descartar esta situación?</DialogTitle>
              <DialogDescription>
                No volveremos a mostrarla mientras siga existiendo. Puedes volver a activarla desde las preferencias.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setConfirmDismiss(null)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={() => void act(confirmDismiss.id, "dismiss")}>
                Descartar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      <AttentionSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} onSaved={() => void load()} />
    </div>
  )
}
