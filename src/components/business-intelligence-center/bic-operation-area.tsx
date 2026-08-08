"use client"

import { CalendarCheck, Package, ShoppingCart, Users, Wallet } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import CierresTab from "@/components/dashboard/cierres-tab"
import { aggregateOrdersByStatus, interpretOperation } from "@/lib/business-intelligence-center"
import type { BicBalance, BicInventario } from "./bic-data"
import { BicMoney, BicSectionTitle, DrillCard, PanitasInterpretation } from "./bic-shared"

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  preparing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
}

/**
 * Área Operación del Business Intelligence Center (FASE 5A).
 *
 * Cuatro tarjetas con profundización (Ventas, Pedidos, Clientes, Inventario),
 * una interpretación conversacional de Panitas y los cierres diarios al final.
 */
export function BicOperationArea({
  balance,
  inventario,
  hideInventario,
}: {
  balance: BicBalance
  inventario: BicInventario | null
  hideInventario: boolean
}) {
  const orders = aggregateOrdersByStatus(balance.statusCounts)
  const customers = balance.customers
  const lowStockCount =
    inventario?.products.filter((p) => p.stock > 0 && p.stock <= 5).length ?? 0

  const interpretation = interpretOperation({
    monthRevenue: balance.monthRevenue,
    monthOrders: balance.monthOrders,
    activeOrders: orders.active,
    pendingOrders: orders.pending,
    customersTotal: customers.total,
    newCustomersThisMonth: customers.newThisMonth,
    productCount: inventario?.productCount ?? 0,
    lowStockCount,
  })

  return (
    <div className="space-y-6">
      <PanitasInterpretation text={interpretation} />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Ventas */}
        <DrillCard
          icon={<ShoppingCart className="size-4.5" />}
          title="Ventas"
          value={<BicMoney value={balance.monthRevenue} />}
          sub={
            <>
              Este mes · ticket promedio <BicMoney value={balance.averageTicketMonth} />
            </>
          }
          accent="brand"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Hoy", value: balance.todayRevenue },
                { label: "Semana", value: balance.weekRevenue },
                { label: "Mes", value: balance.monthRevenue },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="mt-0.5 font-heading text-base font-bold text-foreground">
                    <BicMoney value={item.value} />
                  </p>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Productos más vendidos
              </p>
              {balance.topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos</p>
              ) : (
                <div className="space-y-2">
                  {balance.topProducts.slice(0, 5).map((p, i) => (
                    <div key={p.name} className="flex items-center justify-between text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="text-xs text-muted-foreground">{i + 1}.</span>
                        <span className="truncate">{p.name}</span>
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {p.qty} uds · <BicMoney value={p.revenue} />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DrillCard>

        {/* Pedidos */}
        <DrillCard
          icon={<Package className="size-4.5" />}
          title="Pedidos"
          value={<span>{orders.active}</span>}
          sub={`${orders.total} totales (${orders.cancelled} cancelados)`}
          accent="primary"
        >
          <div className="space-y-3">
            {Object.entries(orders.byStatus).map(([status, count]) => {
              if (count === 0) return null
              const pct = orders.total > 0 ? Math.round((count / orders.total) * 100) : 0
              return (
                <div key={status} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <Badge variant="secondary">{STATUS_LABELS[status] ?? status}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
            {orders.total === 0 && <p className="text-sm text-muted-foreground">Sin pedidos registrados.</p>}
          </div>
        </DrillCard>

        {/* Clientes */}
        <DrillCard
          icon={<Users className="size-4.5" />}
          title="Clientes"
          value={<span>{customers.total}</span>}
          sub="Cartera de clientes"
          accent="emerald"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Nuevos (mes)", value: String(customers.newThisMonth) },
              { label: "Reincidentes", value: String(customers.recurrent) },
              { label: "Inactivos", value: String(customers.inactive) },
              { label: "Valor promedio", value: <BicMoney value={customers.averageCustomerValue} /> },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-0.5 font-heading text-base font-bold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl border border-border/60 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Total gastado por la cartera</span>
            <span className="font-semibold">
              <BicMoney value={customers.totalSpent} />
            </span>
          </div>
        </DrillCard>

        {/* Inventario */}
        {!hideInventario && (
          <DrillCard
            icon={<Wallet className="size-4.5" />}
            title="Inventario"
            value={<span>{inventario?.productCount ?? 0}</span>}
            sub={
              <>
                {lowStockCount} con stock bajo · valor en venta{" "}
                <BicMoney value={inventario?.totalSellValue ?? 0} />
              </>
            }
            accent="amber"
          >
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Valor (costo)", value: inventario?.totalCostValue ?? 0 },
                  { label: "Ganancia potencial", value: inventario?.totalProfit ?? 0 },
                  { label: "Margen", value: `${inventario?.profitMargin.toFixed(1) ?? "0"}%` },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="mt-0.5 font-heading text-base font-bold text-foreground">
                      {typeof item.value === "number" ? <BicMoney value={item.value} /> : item.value}
                    </p>
                  </div>
                ))}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Stock bajo
                </p>
                {lowStockCount === 0 ? (
                  <p className="text-sm text-muted-foreground">Todo el inventario está bien surtido.</p>
                ) : (
                  <div className="space-y-2">
                    {inventario?.products
                      .filter((p) => p.stock <= 5)
                      .slice(0, 5)
                      .map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-sm">
                          <span className="truncate">{p.name}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {p.stock === 0 ? "Agotado" : `${p.stock} uds`}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </DrillCard>
        )}
      </div>

      {/* Cierres diarios */}
      <section className="space-y-4">
        <BicSectionTitle
          icon={<CalendarCheck className="size-4.5" />}
          title="Cierres diarios"
          description="El detalle del dinero del día, del mes y del año"
        />
        <CierresTab />
      </section>
    </div>
  )
}
