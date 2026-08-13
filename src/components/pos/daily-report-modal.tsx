"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CalendarCheck } from "lucide-react"

interface DailyReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loading: boolean
  summary: any
  orders: any[]
}

export function DailyReportModal({ open, onOpenChange, loading, summary, orders }: DailyReportModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onOpenChange(false) }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="size-5 text-sky-600" /> Reporte del día
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-12"><div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : summary ? (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-4">
              <Card><CardContent className="p-2 text-center"><p className="text-[9px] text-muted-foreground uppercase">Ventas</p><p className="text-base font-bold">${summary.totalRevenue.toFixed(2)}</p></CardContent></Card>
              <Card><CardContent className="p-2 text-center"><p className="text-[9px] text-muted-foreground uppercase">Órdenes</p><p className="text-base font-bold">{summary.totalOrders}</p></CardContent></Card>
              <Card><CardContent className="p-2 text-center"><p className="text-[9px] text-muted-foreground uppercase">Tienda</p><p className="text-base font-bold">{summary.storeSales}</p></CardContent></Card>
              <Card><CardContent className="p-2 text-center"><p className="text-[9px] text-muted-foreground uppercase">POS</p><p className="text-base font-bold">{summary.posSales}</p></CardContent></Card>
            </div>

            {summary.creditSales > 0 && (
              <p className="text-xs text-amber-600 font-semibold">Ventas a crédito: {summary.creditSales}</p>
            )}

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {orders.map((o: any) => {
                const isPos = o.posPin || o.shippingMethod === "pickup_store"
                return (
                  <Card key={o.id} className={o.creditTerm ? "border-amber-200" : ""}>
                    <CardContent className="p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold">{o.customerName}</span>
                          <Badge variant="outline" className="text-[8px]">{o.orderNumber}</Badge>
                          {isPos ? <Badge className="bg-indigo-100 text-indigo-700 text-[8px]">POS</Badge> : <Badge className="bg-sky-100 text-sky-700 text-[8px]">Tienda</Badge>}
                        </div>
                        <span className="text-sm font-bold">${o.total.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(o.payments || []).map((p: any) => (
                          <span key={p.id} className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                            p.method === "cash" ? "bg-green-100 text-green-700" :
                            p.method === "bank_transfer" ? "bg-blue-100 text-blue-700" :
                            p.method === "pago_movil" ? "bg-purple-100 text-purple-700" :
                            p.method === "binancepay" ? "bg-orange-100 text-orange-700" : "bg-gray-100"
                          }`}>
                            {p.method === "cash" ? "Efectivo" : p.method === "bank_transfer" ? "Transfer" : p.method === "pago_movil" ? "Pago Móvil" : p.method === "binancepay" ? "Binance Pay" : p.method} ${p.amount.toFixed(2)}
                          </span>
                        ))}
                      </div>
                      {o.creditTerm && o.installments?.length > 0 && (
                        <p className="text-[9px] text-amber-600">{o.installments.length} cuota(s)</p>
                      )}
                      <p className="text-[8px] text-muted-foreground">{new Date(o.createdAt).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">Error al cargar reporte</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
