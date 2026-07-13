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
    increase: { label: "Entrada", color: "text-green-400 bg-green-500/10", icon: ArrowUp },
    decrease: { label: "Salida", color: "text-red-400 bg-red-500/10", icon: ArrowDown },
    adjustment: { label: "Ajuste", color: "text-amber-400 bg-amber-500/10", icon: AlertTriangle },
    sale: { label: "Venta", color: "text-blue-400 bg-blue-500/10", icon: ArrowDown },
    purchase: { label: "Compra", color: "text-green-400 bg-green-500/10", icon: ArrowUp },
    return: { label: "Devolución", color: "text-purple-400 bg-purple-500/10", icon: ArrowUp },
    transfer: { label: "Transferencia", color: "text-gray-400 bg-gray-500/10", icon: ArrowUp },
  }

  if (loading) {
    return (
      <div className="rounded-2xl p-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-48 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-muted p-6">
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
              <div key={m.id} className="flex items-center gap-3 rounded-xl bg-muted p-3 text-sm">
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
