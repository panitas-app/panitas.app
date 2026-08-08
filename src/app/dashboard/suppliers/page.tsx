"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Plus, Search, Truck } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { LoadingState } from "@/components/ui/loading-state"
import { EmptyState } from "@/components/ui/empty-state"
import { toast } from "sonner"
import { SupplierCard } from "@/components/dashboard/suppliers/supplier-card"
import { KpiGrid } from "@/components/dashboard/suppliers/kpi-grid"
import { PaymentModal } from "@/components/dashboard/suppliers/payment-modal"
import { PurchaseModal } from "@/components/dashboard/suppliers/purchase-modal"
import { SupplierFormModal } from "@/components/dashboard/suppliers/supplier-form-modal"
import { SupplierKpis, SupplierState, SupplierSummary, STATE_META, money } from "@/components/dashboard/suppliers/supplier-types"

type Filter = SupplierState | "all"

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "al_dia", label: "Al día" },
  { value: "por_vencer", label: "Por vencer" },
  { value: "vencido", label: "Vencidos" },
  { value: "saldado", label: "Saldados" },
  { value: "inactivo", label: "Inactivos" },
]

export default function SuppliersPage() {
  const [kpis, setKpis] = useState<SupplierKpis | null>(null)
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([])
  const [filter, setFilter] = useState<Filter>("all")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState<SupplierSummary | null>(null)
  const [purchasing, setPurchasing] = useState<SupplierSummary | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prefsRef = useRef<{ loaded: boolean; filter: Filter; search: string }>({ loaded: false, filter: "all", search: "" })

  useEffect(() => {
    let active = true
    fetch("/api/business-memory/proveedores/preferences")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.prefs) return
        const loaded = data.prefs as { filter?: string; favoriteCategory?: string | null }
        prefsRef.current.loaded = true
        prefsRef.current.filter = (loaded.filter ?? "all") as Filter
        setFilter(prefsRef.current.filter)
      })
      .catch(() => {
        prefsRef.current.loaded = true
      })
    return () => {
      active = false
    }
  }, [])

  const savePrefs = useCallback((next: { filter: Filter }) => {
    if (!prefsRef.current.loaded) return
    prefsRef.current = { loaded: true, filter: next.filter, search: "" }
    void fetch("/api/business-memory/proveedores/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!prefsRef.current.loaded) return
    savePrefs({ filter })
  }, [filter, savePrefs])

  const fetchSuppliers = useCallback(async () => {
    try {
      const params = new URLSearchParams({ status: filter })
      if (search.trim()) params.set("search", search.trim())
      const res = await fetch(`/api/suppliers?${params.toString()}`)
      if (!res.ok) throw new Error("Error al cargar proveedores")
      const data = await res.json()
      setKpis(data.kpis)
      setSuppliers(data.suppliers)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar proveedores")
    } finally {
      setLoading(false)
    }
  }, [filter, search])

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuppliers(), 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [fetchSuppliers])

  function handleSaved() {
    fetchSuppliers()
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-heading text-xl font-black flex items-center gap-2">
          <Truck className="size-6 text-sky-500" /> Centro de Proveedores
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Registra tus proveedores, controla las compras y paga tus cuentas por pagar a tiempo.
        </p>
      </div>

      {kpis && <KpiGrid kpis={kpis} />}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 min-w-0 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar proveedor, RIF, teléfono..."
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
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus /> Nuevo
          </Button>
        </div>
      </div>

      {loading && !suppliers.length ? (
        <LoadingState message="Cargando proveedores..." />
      ) : suppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No hay proveedores"
          description={filter !== "all" ? `No hay proveedores con el filtro "${FILTERS.find((f) => f.value === filter)?.label}".` : "Registra tu primer proveedor y controla sus cuentas por pagar."}
          action={
            filter === "all" ? (
              <Button size="sm" onClick={() => setFormOpen(true)}>
                <Plus /> Registrar proveedor
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {suppliers.map((supplier) => (
            <SupplierCard
              key={supplier.id}
              supplier={supplier}
              onPay={setPaying}
              onPurchase={setPurchasing}
            />
          ))}
        </div>
      )}

      {suppliers.length > 0 && (
        <p className="text-[11px] text-muted-foreground text-center">
          Mostrando {suppliers.length} proveedor{suppliers.length === 1 ? "" : "es"} · Total por pagar{" "}
          <strong className="text-foreground">{money(kpis?.totalPayable ?? 0)}</strong>
        </p>
      )}

      {paying && (
        <PaymentModal open onOpenChange={(open) => !open && setPaying(null)} supplier={paying} onSaved={handleSaved} />
      )}
      {purchasing && (
        <PurchaseModal open onOpenChange={(open) => !open && setPurchasing(null)} supplier={purchasing} onSaved={handleSaved} />
      )}
      <SupplierFormModal open={formOpen} onOpenChange={setFormOpen} supplier={null} onSaved={handleSaved} />
    </div>
  )
}
