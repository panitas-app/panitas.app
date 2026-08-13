"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Wallet, MessageCircleQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LoadingState } from "@/components/ui/loading-state"
import { EmptyState } from "@/components/ui/empty-state"
import { SearchInput } from "@/components/ui/search-input"
import { FilterChip } from "@/components/ui/filter-chip"
import { Pagination } from "@/components/ui/pagination"
import { toast } from "sonner"
import { CreditCard } from "@/components/dashboard/credits/credit-card"
import { KpiGrid } from "@/components/dashboard/credits/kpi-grid"
import { PaymentModal } from "@/components/dashboard/credits/payment-modal"
import { RescheduleModal } from "@/components/dashboard/credits/reschedule-modal"
import { CreditKpis, CreditSummary } from "@/components/dashboard/credits/credit-types"

type Filter = "all" | "on_time" | "upcoming" | "overdue" | "paid" | "cancelled"

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "on_time", label: "Al día" },
  { value: "upcoming", label: "Próximos" },
  { value: "overdue", label: "Vencidos" },
  { value: "paid", label: "Pagados" },
  { value: "cancelled", label: "Cancelados" },
]

const PAGE_SIZE = 10

export default function CreditosPage() {
  const [kpis, setKpis] = useState<CreditKpis | null>(null)
  const [credits, setCredits] = useState<CreditSummary[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [filter, setFilter] = useState<Filter>("all")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
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
      const params = new URLSearchParams({ status: filter, page: String(page) })
      if (search.trim()) params.set("search", search.trim())
      const res = await fetch(`/api/creditos?${params.toString()}`)
      if (!res.ok) throw new Error("Error al cargar créditos")
      const data = await res.json()
      setKpis(data.kpis)
      setCredits(data.credits ?? [])
      setTotal(data.total ?? 0)
      setTotalPages(data.totalPages ?? 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar créditos")
    } finally {
      setLoading(false)
    }
  }, [filter, search, page])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchCredits(), 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [fetchCredits])

  function handleFilterChange(next: Filter) {
    setPage(1)
    setFilter(next)
  }

  function handleSearchChange(value: string) {
    setPage(1)
    setSearch(value)
  }

  function handleSaved() {
    fetchCredits()
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-xl font-black flex items-center gap-2">
            <Wallet className="size-6 text-amber-500" /> Centro de Cobranza
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Cobra tus créditos a tiempo, prioriza vencidos y lleva el control de cada cartera.
          </p>
        </div>
        <Link href={`/dashboard/assistant?q=${encodeURIComponent("¿Cuál es mi cartera vencida y qué debería cobrar hoy?")}`}>
          <Button variant="outline" className="gap-1.5">
            <MessageCircleQuestion className="size-4" /> Preguntar a Panitas
          </Button>
        </Link>
      </div>

      {kpis && <KpiGrid kpis={kpis} />}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Buscar cliente, teléfono u orden..."
          className="sm:max-w-xs"
        />
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <FilterChip
              key={f.value}
              label={f.label}
              active={filter === f.value}
              onClick={() => handleFilterChange(f.value)}
            />
          ))}
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
        <>
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
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </>
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
