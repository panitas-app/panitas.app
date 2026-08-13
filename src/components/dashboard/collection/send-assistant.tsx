"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ExternalLink, MessageCircle, Send, Search, Sparkles, UserRound, Wallet } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyState } from "@/components/ui/empty-state"
import { SearchInput } from "@/components/ui/search-input"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import type { CreditSummary } from "@/components/dashboard/credits/credit-types"
import { ContactHistory } from "./contact-history"
import { suggestCategory, suggestLevel } from "@/lib/collection"
import { useDebounce } from "@/hooks/use-debounce"
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  LEVEL_META,
  formatDate,
  money,
  type CollectionCategory,
  type CollectionLevel,
  type CollectionRecommendation,
  type CollectionSettings,
  type CollectionTemplate,
  type RenderedReminder,
} from "./collection-types"
import { cn } from "@/lib/utils"

interface SelectedCredit {
  orderId: string
  orderNumber: string
  customerName: string
  customerPhone: string
  pending: number
  overdueDays: number
  nextDueDate: string | null
  attempts: number
}

const LEVELS: CollectionLevel[] = [1, 2, 3]

export function SendAssistant() {
  const [recommendations, setRecommendations] = useState<CollectionRecommendation[]>([])
  const [templates, setTemplates] = useState<CollectionTemplate[]>([])
  const [settings, setSettings] = useState<CollectionSettings | null>(null)
  const [loadingRecs, setLoadingRecs] = useState(true)

  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState<CreditSummary[]>([])
  const [searching, setSearching] = useState(false)
  const debouncedSearch = useDebounce(search, 350)

  const [selected, setSelected] = useState<SelectedCredit | null>(null)
  const [category, setCategory] = useState<CollectionCategory>("primer_recordatorio")
  const [level, setLevel] = useState<CollectionLevel>(1)
  const [templateId, setTemplateId] = useState<string>("")
  const [body, setBody] = useState("")

  const [reminder, setReminder] = useState<RenderedReminder | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [historyRefresh, setHistoryRefresh] = useState(0)

  const fetchRecommendations = useCallback(async () => {
    try {
      const res = await fetch("/api/collection/recommendations?limit=20")
      if (!res.ok) throw new Error("Error al cargar recomendaciones")
      const data = await res.json()
      setRecommendations(data.recommendations)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar recomendaciones")
    } finally {
      setLoadingRecs(false)
    }
  }, [])

  const fetchBase = useCallback(async () => {
    const [tRes, sRes] = await Promise.all([
      fetch("/api/collection/templates"),
      fetch("/api/collection/settings"),
    ])
    if (tRes.ok) {
      const data = await tRes.json()
      setTemplates(data.templates)
    }
    if (sRes.ok) {
      const data = await sRes.json()
      setSettings(data.settings)
    }
  }, [])

  useEffect(() => {
    fetchRecommendations()
    fetchBase()
  }, [fetchRecommendations, fetchBase])

  const categoryTemplates = useMemo(
    () => templates.filter((t) => t.category === category && t.isActive),
    [templates, category]
  )

  function applyCategory(next: CollectionCategory) {
    setCategory(next)
    setReminder(null)
    const first = templates.find((t) => t.category === next && t.isActive)
    setTemplateId(first?.id ?? "")
    setBody(first?.body ?? "")
  }

  function selectCredit(c: SelectedCredit) {
    setSelected(c)
    setReminder(null)
    const nextCat = suggestCategory(c.overdueDays, c.attempts)
    setLevel(suggestLevel(c.overdueDays))
    applyCategory(nextCat)
    setHistoryRefresh((n) => n + 1)
  }

  function pickRecommendation(rec: CollectionRecommendation) {
    selectCredit({
      orderId: rec.orderId,
      orderNumber: rec.orderNumber,
      customerName: rec.customerName,
      customerPhone: rec.customerPhone,
      pending: rec.pending,
      overdueDays: rec.overdueDays,
      nextDueDate: rec.nextDueDate,
      attempts: rec.attempts,
    })
  }

  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchResults([])
      setSearching(false)
      return
    }
    let cancelled = false
    setSearching(true)
    ;(async () => {
      try {
        const params = new URLSearchParams({ status: "all", search: debouncedSearch.trim(), limit: "15" })
        const res = await fetch(`/api/creditos?${params.toString()}`)
        if (!res.ok) throw new Error("Error al buscar créditos")
        const data = await res.json()
        if (!cancelled) setSearchResults(data.credits.filter((c: CreditSummary) => c.state !== "paid" && c.state !== "cancelled"))
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Error al buscar créditos")
      } finally {
        if (!cancelled) setSearching(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [debouncedSearch])

  function pickSearchCredit(c: CreditSummary) {
    selectCredit({
      orderId: c.orderId,
      orderNumber: c.orderNumber,
      customerName: c.customerName,
      customerPhone: c.customerPhone,
      pending: c.pending,
      overdueDays: c.overdueDays,
      nextDueDate: c.nextDueDate,
      attempts: c.attempts,
    })
  }

  async function prepare() {
    if (!selected) return
    setPreparing(true)
    try {
      const res = await fetch("/api/collection/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selected.orderId,
          category,
          level,
          templateId: templateId || undefined,
          bodyOverride: body.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al preparar el mensaje")
      }
      const data = await res.json()
      setReminder(data.reminder)
      setHistoryRefresh((n) => n + 1)
      toast.success("Mensaje preparado (no enviado)")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al preparar el mensaje")
    } finally {
      setPreparing(false)
    }
  }

  const levelChip = selected ? LEVEL_META[level] : null

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Columna izquierda: elegir crédito */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardAction>
              <Sparkles className="size-4 text-amber-500" />
            </CardAction>
            <CardTitle>¿A quién contactar hoy?</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRecs ? (
              <p className="text-xs text-muted-foreground py-6 text-center">Calculando recomendaciones...</p>
            ) : recommendations.length === 0 ? (
              <EmptyState icon={Wallet} title="Sin recomendaciones" description="No hay créditos pendientes por contactar." />
            ) : (
              <div className="space-y-2">
                {recommendations.map((rec) => {
                  const active = selected?.orderId === rec.orderId
                  const lvl = LEVEL_META[rec.suggestedLevel]
                  return (
                    <button
                      key={rec.orderId}
                      onClick={() => pickRecommendation(rec)}
                      className={cn(
                        "w-full rounded-xl border p-3 text-left transition-colors",
                        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <UserRound className="size-4 shrink-0 text-muted-foreground" />
                          <p className="truncate text-sm font-semibold">{rec.customerName}</p>
                        </div>
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", lvl.chip)}>
                          <span className={cn("size-1.5 rounded-full", lvl.dot)} /> Nivel {rec.suggestedLevel}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                        <span className="font-bold text-foreground">{money(rec.pending)}</span>
                        <span>Orden #{rec.orderNumber}</span>
                        {rec.overdueDays > 0 ? (
                          <span className="text-red-600 dark:text-red-400 font-semibold">Vencido {rec.overdueDays}d</span>
                        ) : rec.nextDueDate ? (
                          <span>Vence {formatDate(rec.nextDueDate)}</span>
                        ) : null}
                        <span>
                          {rec.daysSinceLastContact === null
                            ? "Sin contactar"
                            : rec.daysSinceLastContact === 0
                              ? "Contactado hoy"
                              : `Contactado hace ${rec.daysSinceLastContact}d`}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardAction>
              <Search className="size-4 text-muted-foreground" />
            </CardAction>
            <CardTitle>Buscar otro crédito</CardTitle>
          </CardHeader>
          <CardContent>
            <SearchInput value={search} onChange={setSearch} placeholder="Nombre, teléfono u orden..." />
            {searching && <p className="text-[11px] text-muted-foreground mt-2">Buscando...</p>}
            {searchResults.length > 0 && (
              <div className="mt-3 space-y-2">
                {searchResults.map((c) => (
                  <button
                    key={c.orderId}
                    onClick={() => pickSearchCredit(c)}
                    className="w-full rounded-xl border border-border p-3 text-left hover:border-primary/50 transition-colors"
                  >
                    <p className="text-sm font-semibold">{c.customerName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Orden #{c.orderNumber} · {money(c.pending)} pendiente
                      {c.overdueDays > 0 ? ` · vencido ${c.overdueDays}d` : ""}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Columna derecha: preparar mensaje */}
      <div className="space-y-4">
        {!selected ? (
          <Card>
            <CardHeader>
              <CardAction>
                <MessageCircle className="size-4 text-emerald-500" />
              </CardAction>
              <CardTitle>Asistente de envío</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground py-8 text-center">
                Selecciona un crédito a la izquierda para preparar su recordatorio. Panitas nunca envía mensajes
                automáticamente: tú revisas, envías y confirmas cada uno.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardAction className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/creditos/${selected.orderId}`}
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    Ver crédito
                  </Link>
                  <Wallet className="size-4 text-amber-500" />
                </CardAction>
                <CardTitle className="truncate">
                  {selected.customerName} · {money(selected.pending)}
                </CardTitle>
                <CardDescription>
                  Orden #{selected.orderNumber} · {selected.customerPhone}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Categoría</p>
                    <Select value={category} onValueChange={(v) => applyCategory(v as CollectionCategory)}>
                      <SelectTrigger size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_ORDER.map((c) => (
                          <SelectItem key={c} value={c}>
                            {CATEGORY_META[c].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      Nivel
                      {selected.overdueDays > 0 && (
                        <span className="ml-1 normal-case text-amber-600 dark:text-amber-400">
                          (sugerido {suggestLevel(selected.overdueDays)})
                        </span>
                      )}
                    </p>
                    <Select value={String(level)} onValueChange={(v) => setLevel(Number(v) as CollectionLevel)}>
                      <SelectTrigger size="sm">
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
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Plantilla</p>
                  <Select value={templateId} onValueChange={(v) => {
                    if (!v) return
                    setTemplateId(v)
                    const t = templates.find((x) => x.id === v)
                    if (t) setBody(t.body)
                    setReminder(null)
                  }}>
                    <SelectTrigger size="sm">
                      <SelectValue placeholder="Elegir plantilla" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryTemplates.length === 0 && (
                        <SelectItem value="__none" disabled>Sin plantillas para esta categoría</SelectItem>
                      )}
                      {categoryTemplates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Mensaje</p>
                  <Textarea
                    value={body}
                    onChange={(e) => {
                      setBody(e.target.value)
                      setReminder(null)
                    }}
                    rows={6}
                    className="text-xs leading-relaxed"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Usa variables: {CATEGORY_META[category].label} · {levelChip && levelChip.label}
                    {settings && settings.paymentMethods.length > 0 && <> · Métodos: {settings.paymentMethods.join(", ")}</>}
                  </p>
                </div>

                <Button onClick={prepare} disabled={preparing || !body.trim()} className="w-full">
                  <Send /> {preparing ? "Preparando..." : "Preparar mensaje"}
                </Button>
            </CardContent>
          </Card>

          {reminder && (
              <Card>
                <CardHeader>
                  <CardAction>
                    <MessageCircle className="size-4 text-emerald-500" />
                  </CardAction>
                  <CardTitle>Mensaje preparado (no enviado)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-xl border bg-muted/40 p-3">
                    <p className="text-[11px] text-muted-foreground mb-1">
                      Para {reminder.customerName} · {CATEGORY_META[reminder.category].label} · Nivel {reminder.level}
                    </p>
                    <p className="text-xs leading-relaxed whitespace-pre-wrap">{reminder.message}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={reminder.whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonVariants({ size: "sm" })}
                    >
                      <ExternalLink /> Abrir en WhatsApp
                    </a>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/collection/contacts", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ logId: reminder.logId, status: "sent" }),
                          })
                          if (!res.ok) throw new Error("Error al marcar")
                          toast.success("Contacto marcado como enviado")
                          setHistoryRefresh((n) => n + 1)
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "Error al marcar")
                        }
                      }}
                    >
                      Marcar como enviado
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardAction>
                  <MessageCircle className="size-4 text-violet-500" />
                </CardAction>
                <CardTitle>Historial de contacto</CardTitle>
              </CardHeader>
              <CardContent>
                <ContactHistory orderId={selected.orderId} refreshKey={historyRefresh} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
