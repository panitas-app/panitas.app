"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Search, Wallet } from "lucide-react"
import { Input } from "@/components/ui/input"
import { LoadingState } from "@/components/ui/loading-state"
import { EmptyState } from "@/components/ui/empty-state"
import { toast } from "sonner"
import { CreditCard } from "@/components/dashboard/credits/credit-card"
import { KpiGrid } from "@/components/dashboard/credits/kpi-grid"
import { PaymentModal } from "@/components/dashboard/credits/payment-modal"
import { RescheduleModal } from "@/components/dashboard/credits/reschedule-modal"
import { CreditKpis, CreditSummary, STATE_META, money } from "@/components/dashboard/credits/credit-types"

type Filter = "all" | "on_time" | "upcoming" | "overdue" | "paid" | "cancelled"

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "on_time", label: "Al día" },
  { value: "upcoming", label: "Próximos" },
  { value: "overdue", label: "Vencidos" },
  { value: "paid", label: "Pagados" },
  { value: "cancelled", label: "Cancelados" },
]

export default function CreditosPage() {
  const [kpis, setKpis] = useState<CreditKpis | null>(null)
  const [credits, setCredits] = useState<CreditSummary[]>([])
  const [filter, setFilter] = useState<Filter>("all")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState<CreditSummary | null>(null)
  const [rescheduling, setRescheduling] = useState<CreditSummary | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prefsRef = useRef<{ loaded: boolean; filter: Filter; search: string }>({ loaded: false, filter: "all", search: "" })

  useEffect(() => {
    let active = true
    fetch("/api/business-memory/creditos/preferences")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.prefs) return
        const loaded = data.prefs as { filter?: string; search?: string }
        prefsRef.current.loaded = true
        prefsRef.current.filter = (loaded.filter ?? "all") as Filter
        prefsRef.current.search = loaded.search ?? ""
        setFilter(prefsRef.current.filter)
        setSearch(prefsRef.current.search)
      })
      .catch(() => {
        prefsRef.current.loaded = true
      })
    return () => {
      active = false
    }
  }, [])

  const savePrefs = useCallback((next: { filter: Filter; search: string }) => {
    if (!prefsRef.current.loaded) return
    prefsRef.current = { loaded: true, ...next }
    void fetch("/api/business-memory/creditos/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!prefsRef.current.loaded) return
    savePrefs({ filter, search })
  }, [filter, search, savePrefs])

  const fetchCredits = useCallback(async () => {
    try {
      const params = new URLSearchParams({ status: filter })
      if (search.trim()) params.set("search", search.trim())
      const res = await fetch(`/api/creditos?${params.toString()}`)
      if (!res.ok) throw new Error("Error al cargar créditos")
      const data = await res.json()
      setKpis(data.kpis)
      setCredits(data.credits)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar créditos")
    } finally {
      setLoading(false)
    }
  }, [filter, search])

  useEffect(() => {
    fetchCredits()
  }, [fetchCredits])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchCredits(), 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [fetchCredits])

  function handleSaved() {
    fetchCredits()
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-heading text-xl font-black flex items-center gap-2">
          <Wallet className="size-6 text-amber-500" /> Centro de Cobranza
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Cobra tus créditos a tiempo, prioriza vencidos y lleva el control de cada cartera.
        </p>
      </div>

      {kpis && <KpiGrid kpis={kpis} />}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 min-w-0 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente, teléfono u orden..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map((f) => {
            const active = filter === f.value
            const dot = f.value === "all" ? null : STATE_META[f.value].dot
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`inline-flex items-center gap-1.5 px-3.5 h-9 text-xs font-bold rounded border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/50"}`}
              >
                {dot && <span className={`size-1.5 rounded-full ${dot}`} />}
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      {loading && !credits.length ? (
        <LoadingState message="Cargando créditos..." />
      ) : credits.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No hay créditos"
          description={filter !== "all" ? `No hay créditos con el filtro "${FILTERS.find((f) => f.value === filter)?.label}".` : "Los créditos creados desde el POS aparecerán aquí con su estado y saldo."}
        />
      ) : (
        <div className="space-y-3">
          {credits.map((credit) => (
            <CreditCard
              key={credit.orderId}
              credit={credit}
              onPay={setPaying}
              onReschedule={setRescheduling}
            />
          ))}
        </div>
      )}

      {credits.length > 0 && (
        <p className="text-[11px] text-muted-foreground text-center">
          Mostrando {credits.length} crédito{credits.length === 1 ? "" : "s"} · Total pendiente{" "}
          <strong className="text-foreground">{money(kpis?.totalPending ?? 0)}</strong>
        </p>
      )}

      {paying && (
        <PaymentModal open onOpenChange={(open) => !open && setPaying(null)} credit={paying} onSaved={handleSaved} />
      )}
      {rescheduling && (
        <RescheduleModal open onOpenChange={(open) => !open && setRescheduling(null)} credit={rescheduling} onSaved={handleSaved} />
      )}
    </div>
  )
}
