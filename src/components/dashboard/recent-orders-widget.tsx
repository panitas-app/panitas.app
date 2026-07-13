"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingCart, ArrowRight } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface OrderSummary {
  id: string
  orderNumber: string
  total: number
  status: string
  customerName: string
  createdAt: Date
}

interface Props {
  orders: OrderSummary[]
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-amber-500/10 text-amber-400" },
  confirmed: { label: "Confirmado", color: "bg-blue-500/10 text-blue-400" },
  preparing: { label: "Preparando", color: "bg-purple-500/10 text-purple-400" },
  shipped: { label: "Enviado", color: "bg-indigo-500/10 text-indigo-400" },
  delivered: { label: "Entregado", color: "bg-emerald-500/10 text-emerald-400" },
  cancelled: { label: "Cancelado", color: "bg-red-500/10 text-red-400" },
}

export function RecentOrdersWidget({ orders }: Props) {
  if (orders.length === 0) {
    return (
      <Card className="rounded-3xl bg-card shadow-xs overflow-hidden">
        <CardHeader className="pb-4 pt-7 px-6">
          <CardTitle className="font-heading text-lg font-bold text-accent flex items-center gap-2">
            <ShoppingCart className="size-5 text-primary" />
            Órdenes Recientes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <ShoppingCart className="size-8 text-muted-foreground/70" />
            <p className="text-sm font-semibold">Sin órdenes aún</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-3xl bg-card shadow-xs overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-4 pt-7 px-6">
        <CardTitle className="font-heading text-lg font-bold text-accent flex items-center gap-2">
          <ShoppingCart className="size-5 text-primary" />
          Órdenes Recientes
        </CardTitle>
        <Link
          href="/dashboard/orders"
          className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
        >
          Ver todas <ArrowRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {orders.slice(0, 6).map((order) => {
            const statusInfo = STATUS_LABELS[order.status] || { label: order.status, color: "bg-muted text-foreground/80" }
            const date = new Date(order.createdAt)
            const dateStr = date.toLocaleDateString("es-VE", { day: "numeric", month: "short" })
            return (
              <Link
                key={order.id}
                href={`/dashboard/orders/${order.id}`}
                className="flex items-center justify-between px-6 py-3.5 hover:bg-muted transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <ShoppingCart className="size-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-accent truncate">#{order.orderNumber}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{order.customerName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-semibold text-muted-foreground">{dateStr}</span>
                  <span className="text-sm font-black text-accent">${order.total.toFixed(2)}</span>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", statusInfo.color)}>
                    {statusInfo.label}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
