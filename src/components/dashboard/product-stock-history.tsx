"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

export function ProductStockHistory({ productId }: { productId: string }) {
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMovements = async () => {
      try {
        const res = await fetch(`/api/products/stock?productId=${productId}&limit=50`)
        if (res.ok) {
          const data = await res.json()
          setMovements(data.data || [])
        }
      } catch { /* ignore */ }
      finally { setLoading(false) }
    }
    fetchMovements()
  }, [productId])

  const typeConfig: Record<string, { label: string; color: string; icon: any }> = {
    increase: { label: "Entrada", color: "text-green-600 border-green-200 bg-green-50", icon: ArrowUp },
    decrease: { label: "Salida", color: "text-red-600 border-red-200 bg-red-50", icon: ArrowDown },
    adjustment: { label: "Ajuste", color: "text-amber-600 border-amber-200 bg-amber-50", icon: AlertTriangle },
    sale: { label: "Venta", color: "text-blue-600 border-blue-200 bg-blue-50", icon: ArrowDown },
    purchase: { label: "Compra", color: "text-green-600 border-green-200 bg-green-50", icon: ArrowUp },
    return: { label: "Devolución", color: "text-purple-600 border-purple-200 bg-purple-50", icon: ArrowUp },
    transfer: { label: "Transferencia", color: "text-gray-600 border-gray-200 bg-gray-50", icon: ArrowUp },
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/50 p-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-48 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-white dark:bg-gray-900 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Package className="size-5 text-muted-foreground" />
        <h3 className="font-semibold text-accent">Historial de movimientos de stock</h3>
      </div>

      {movements.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No hay movimientos registrados para este producto
        </p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {movements.map(m => {
            const cfg = typeConfig[m.type] || typeConfig.adjustment
            const Icon = cfg.icon
            return (
              <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border/50 p-3 text-sm">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${cfg.color}`}>
                  <Icon className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
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
                  <p className={`font-bold tabular-nums ${m.quantity > 0 ? "text-green-600" : "text-red-600"}`}>
                    {m.quantity > 0 ? "+" : ""}{m.quantity}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Saldo: {m.balance}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
