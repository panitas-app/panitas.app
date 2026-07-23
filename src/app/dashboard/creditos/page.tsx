"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { CalendarCheck, ChevronDown, ChevronRight, Phone, CheckCircle, Clock, AlertTriangle, Search } from "lucide-react"

interface Installment {
  id: string; number: number; amount: number; dueDate: string; status: string
  paidAt: string | null; paidAmount: number | null
}

interface CreditOrder {
  id: string; orderNumber: string; customerName: string; customerPhone: string
  total: number; downPayment: number | null; totalCredito: number | null
  creditTerm: string | null; createdAt: string
  installments: Installment[]
}

function daysUntil(d: string): number {
  const diff = new Date(d).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function CreditosPage() {
  const [orders, setOrders] = useState<CreditOrder[]>([])
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [payingId, setPayingId] = useState<string | null>(null)
  const [payingInstallment, setPayingInstallment] = useState<Installment | null>(null)
  const [payMethod, setPayMethod] = useState("cash")
  const [payReference, setPayReference] = useState("")

  useEffect(() => { fetchCreditos() }, [filter])

  async function fetchCreditos() {
    try {
      const res = await fetch(`/api/creditos?status=${filter}`)
      if (res.ok) setOrders(await res.json())
    } catch { toast.error("Error al cargar créditos") }
  }

  async function markAsPaid() {
    if (payingId === payingInstallment?.id) return
    if (!payingInstallment) return
    setPayingId(payingInstallment.id)
    try {
      const res = await fetch("/api/installments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: payingInstallment.id,
          paidAmount: payingInstallment.amount,
          method: payMethod,
          reference: payReference || null,
        }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      toast.success(`Cuota #${payingInstallment.number} marcada como pagada`)
      fetchCreditos()
      setPayingInstallment(null)
      setPayReference("")
    } catch (e: any) { toast.error(e.message) }
    finally { setPayingId(null) }
  }

  function toggleOrder(id: string) {
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const filtered = orders.filter((o) => {
    if (!search) return true
    const q = search.toLowerCase()
    return o.customerName.toLowerCase().includes(q) || o.customerPhone.includes(q) || o.orderNumber.toLowerCase().includes(q)
  })

  const paidTotal = orders.reduce((s, o) => s + o.installments.filter((i) => i.status === "paid").reduce((a, i) => a + (i.paidAmount || i.amount), 0), 0)
  const pendingTotal = orders.reduce((s, o) => s + o.installments.filter((i) => i.status === "pending").reduce((a, i) => a + i.amount, 0), 0)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-xl font-black flex items-center gap-2">
            <CalendarCheck className="size-6 text-amber-500" /> Créditos
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {orders.length} créditos activos · Cobrado: ${paidTotal.toFixed(2)} · Pendiente: ${pendingTotal.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente, teléfono u orden..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        {["all", "pending", "late", "paid"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 h-9 text-xs font-bold rounded border transition-colors ${filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/50"}`}>
            {f === "all" ? "Todos" : f === "pending" ? "Pendientes" : f === "late" ? "Vencidos" : "Pagados"}
          </button>
        ))}
      </div>

      {/* Credit list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <CalendarCheck className="size-12 mb-3" />
            <p className="text-sm">No hay créditos {filter !== "all" ? `con filtro "${filter}"` : ""}</p>
          </div>
        ) : (
          filtered.map((order) => {
            const totalPaid = order.installments.filter((i) => i.status === "paid").reduce((s, i) => s + (i.paidAmount || i.amount), 0)
            const totalPending = order.installments.filter((i) => i.status === "pending").reduce((s, i) => s + i.amount, 0)
            const paidCount = order.installments.filter((i) => i.status === "paid").length
            const totalCount = order.installments.length
            const hasLate = order.installments.some((i) => i.status === "pending" && daysUntil(i.dueDate) < 0)
            const isExpanded = expanded.has(order.id)

            return (
              <Card key={order.id} className={`border ${hasLate ? "border-red-200 dark:border-red-900" : "border-border"}`}>
                <CardContent className="p-0">
                  <button onClick={() => toggleOrder(order.id)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold truncate">{order.customerName}</p>
                        {hasLate && <AlertTriangle className="size-4 text-red-500 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {order.customerPhone} · #{order.orderNumber}
                      </p>
                    </div>
                    <div className="text-right text-xs shrink-0">
                      <p className="font-bold">${order.totalCredito?.toFixed(2) || order.total.toFixed(2)}</p>
                      <p className="text-muted-foreground">{paidCount}/{totalCount} cuotas</p>
                    </div>
                    <div className="shrink-0">
                      {isExpanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {/* Expanded installments */}
                  {isExpanded && (
                    <div className="border-t border-border px-4 py-3 space-y-2">
                      {order.installments.map((inst) => {
                        const days = daysUntil(inst.dueDate)
                        const isPaid = inst.status === "paid"
                        const isLate = !isPaid && days < 0
                        const isPending = !isPaid && days >= 0

                        return (
                          <div key={inst.id} className={`flex items-center gap-3 rounded-lg p-3 ${isPaid ? "bg-green-50 dark:bg-green-950/20" : isLate ? "bg-red-50 dark:bg-red-950/20" : "bg-blue-50 dark:bg-blue-950/20"}`}>
                            <div className={`flex size-8 items-center justify-center rounded-full ${isPaid ? "bg-green-100 text-green-600 dark:bg-green-900/30" : isLate ? "bg-red-100 text-red-600 dark:bg-red-900/30" : "bg-blue-100 text-blue-600 dark:bg-blue-900/30"}`}>
                              {isPaid ? <CheckCircle className="size-4" /> : isLate ? <AlertTriangle className="size-4" /> : <Clock className="size-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold">Cuota #{inst.number}</p>
                              <p className="text-[11px] text-muted-foreground">
                                ${inst.amount.toFixed(2)} · Vence: {formatDate(inst.dueDate)}
                              </p>
                            </div>
                            <div className="text-right text-xs shrink-0">
                              {isPaid ? (
                                <span className="text-green-600 font-semibold">Pagada {inst.paidAt ? formatDate(inst.paidAt) : ""}</span>
                              ) : isLate ? (
                                <span className="text-red-600 font-semibold">Vencida {Math.abs(days)} días</span>
                              ) : (
                                <span className="text-blue-600 font-semibold">Faltan {days} días</span>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              {!isPaid && (
                                <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => { setPayingInstallment(inst); setPayReference(""); setPayMethod("cash") }} disabled={payingId === inst.id}>
                                  <CheckCircle className="size-3" /> {payingId === inst.id ? "..." : "Pagar"}
                                </Button>
                              )}
                              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => {
                                const msg = encodeURIComponent(`Hola ${order.customerName}, te recordamos que tu cuota #${inst.number} de $${inst.amount.toFixed(2)} está pendiente. Vence el ${formatDate(inst.dueDate)}. ¡Gracias!`)
                                window.open(`https://wa.me/${order.customerPhone.replace(/^0+/, "58")}?text=${msg}`, "_blank")
                              }}>
                                <Phone className="size-3" /> WhatsApp
                              </Button>
                            </div>
                          </div>
                        )
                      })}

                      {/* Summary */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                        <span>Total crédito: <strong>${order.totalCredito?.toFixed(2) || ""}</strong></span>
                        <span>Pagado: <strong className="text-green-600">${totalPaid.toFixed(2)}</strong></span>
                        <span>Pendiente: <strong className={totalPending > 0 ? "text-amber-600" : "text-green-600"}>${totalPending.toFixed(2)}</strong></span>
                        <span>Inicial: <strong>${order.downPayment?.toFixed(2) || "$0.00"}</strong></span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {payingInstallment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPayingInstallment(null)}>
          <div className="bg-background rounded-xl shadow-2xl max-w-sm w-full mx-4 p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-sm">Pago de cuota #{payingInstallment.number}</h3>
            <p className="text-xs text-muted-foreground">Monto: <strong className="text-foreground">${payingInstallment.amount.toFixed(2)}</strong></p>

            <div className="space-y-2">
              <p className="text-xs font-semibold">Método de pago</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: "cash", l: "Efectivo" },
                  { v: "bank_transfer", l: "Transferencia" },
                  { v: "pago_movil", l: "Pago Móvil" },
                  { v: "binancepay", l: "Binance Pay" },
                ].map((m) => (
                  <button
                    key={m.v}
                    onClick={() => setPayMethod(m.v)}
                    className={`h-9 text-xs font-bold rounded-lg border transition-colors ${payMethod === m.v ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/50"}`}
                  >
                    {m.l}
                  </button>
                ))}
              </div>
            </div>

            <Input
              placeholder="Referencia (opcional)"
              value={payReference}
              onChange={(e) => setPayReference(e.target.value)}
              className="h-9 text-sm"
            />

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setPayingInstallment(null)}>Cancelar</Button>
              <Button className="flex-1" onClick={markAsPaid} disabled={payingId === payingInstallment.id}>
                {payingId === payingInstallment.id ? "Procesando..." : `Confirmar $${payingInstallment.amount.toFixed(2)}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
