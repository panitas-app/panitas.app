"use client"

import { useState, useEffect, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { FilterChip } from "@/components/ui/filter-chip"
import { Pagination } from "@/components/ui/pagination"
import { Package, ArrowUp, ArrowDown, AlertTriangle } from "lucide-react"

type Movement = {
  id: string
  type: string
  quantity: number
  balance: number
  concept: string | null
  reference: string | null
  createdAt: string
}

const TYPE_FILTERS = [
  { value: "", label: "Todos" },
  { value: "increase", label: "Entradas" },
  { value: "decrease", label: "Salidas" },
  { value: "adjustment", label: "Ajustes" },
  { value: "sale", label: "Ventas" },
]

export function ProductStockHistory({ productId }: { productId: string }) {
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const fetchMovements = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ productId, page: String(page), limit: "20" })
      if (type) params.set("type", type)
      const res = await fetch(`/api/products/stock?${params}`)
      if (res.ok) {
        const json = await res.json()
        setMovements(json.data || [])
        setTotal(json.total || 0)
        setTotalPages(json.totalPages || 0)
      }
    } catch (e) { console.error("[unhandled error]", e) }
    finally { setLoading(false) }
  }, [productId, type, page])

  useEffect(() => { fetchMovements() }, [fetchMovements])

  const typeConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
    increase: { label: "Entrada", color: "text-success bg-success/10", icon: ArrowUp },
    decrease: { label: "Salida", color: "text-destructive bg-destructive/10", icon: ArrowDown },
    adjustment: { label: "Ajuste", color: "text-warning bg-warning/10", icon: AlertTriangle },
    sale: { label: "Venta", color: "text-info bg-info/10", icon: ArrowDown },
    purchase: { label: "Compra", color: "text-success bg-success/10", icon: ArrowUp },
    return: { label: "Devolución", color: "text-purple-600 bg-purple-500/10", icon: ArrowUp },
    transfer: { label: "Transferencia", color: "text-muted-foreground bg-muted", icon: ArrowUp },
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
        <Package className="size-5 text-muted-foreground" />
        <h3 className="font-semibold">Historial de movimientos de stock</h3>
      </div>

      <div className="flex flex-wrap gap-2 p-4 pb-0">
        {TYPE_FILTERS.map((f) => (
          <FilterChip
            key={f.value}
            label={f.label}
            active={type === f.value}
            onClick={() => { setType(f.value); setPage(1) }}
          />
        ))}
      </div>

      {loading ? (
        <div className="space-y-2 p-4 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded-xl" />)}
        </div>
      ) : movements.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          No hay movimientos registrados para este producto
        </p>
      ) : (
        <div className="space-y-2 p-4">
          {movements.map(m => {
            const cfg = typeConfig[m.type] || typeConfig.adjustment
            const Icon = cfg.icon
            return (
              <div key={m.id} className="flex items-center gap-3 rounded-xl bg-muted p-3 text-sm">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cfg.color}`}>
                  <Icon className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{cfg.label}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(m.createdAt).toLocaleString("es-VE")}
                    </span>
                  </div>
                  {m.concept && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{m.concept}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-bold tabular-nums ${m.quantity > 0 ? "text-success" : "text-destructive"}`}>
                    {m.quantity > 0 ? "+" : ""}{m.quantity}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Saldo: {m.balance}</p>
                </div>
              </div>
            )
          })}
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}
