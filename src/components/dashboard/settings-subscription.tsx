"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Crown, CheckCircle2, Clock, XCircle, CreditCard, Upload, CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { BANKS_VENEZUELA } from "@/lib/constants"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

interface Subscription {
  id: string
  plan: string
  status: string
  amount: number
  currency: string
  period: string
  startDate: string | null
  endDate: string | null
  createdAt: string
}

interface SettingsSubscriptionProps {
  storeId: string
  storePlan: string
}

const planLabels: Record<string, string> = {
  free: "Gratis", basic: "Básico", advanced: "Avanzado",
}

const planDescriptions: Record<string, string> = {
  free: "30 productos, enlace público, Pago Móvil básico",
  basic: "150 productos, PanaPago completo, analíticas, envíos, soporte WhatsApp",
  advanced: "Productos ilimitados, dominio propio, API, exportación Excel, multi-colaboradores, soporte 24/7",
}

const pricing: Record<string, { monthly: number; yearly: number }> = {
  basic: { monthly: 9.99, yearly: 7.99 },
  advanced: { monthly: 19.99, yearly: 15.99 },
}

export function SettingsSubscription({ storeId, storePlan }: SettingsSubscriptionProps) {
  const [active, setActive] = useState<Subscription | null>(null)
  const [history, setHistory] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)

  // Upgrade form
  const [selectedPlan, setSelectedPlan] = useState("basic")
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly")
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer")
  const [bankOrigin, setBankOrigin] = useState("")
  const [reference, setReference] = useState("")
  const [paidAt, setPaidAt] = useState<Date>(new Date())
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/subscriptions")
        const data = await res.json()
        setActive(data.active || null)
        setHistory(data.subscriptions || [])
      } catch {} finally { setLoading(false) }
    }
    load()
  }, [])

  async function handleSubmit() {
    if (!paymentMethod) { toast.error("Selecciona un método de pago"); return }
    setSubmitting(true)
    try {
      let receiptImageUrl: string | null = null
      if (receiptFile) {
        const fd = new FormData()
        fd.append("file", receiptFile)
        const upRes = await fetch("/api/upload", { method: "POST", body: fd })
        if (upRes.ok) {
          const upData = await upRes.json()
          receiptImageUrl = upData.url
        }
      }

      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          period,
          paymentMethod,
          reference: reference || null,
          bankOrigin: bankOrigin || null,
          receiptImage: receiptImageUrl,
          paidAt: paidAt.toISOString(),
        }),
      })

      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Error al crear solicitud") }

      toast.success("Solicitud enviada. El administrador verificará el pago.")
      setShowForm(false)
      setReceiptFile(null)
      // Reload
      const reloadRes = await fetch("/api/subscriptions")
      const reloadData = await reloadRes.json()
      setHistory(reloadData.subscriptions || [])
    } catch (e: any) {
      toast.error(e.message)
    } finally { setSubmitting(false) }
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      active: "bg-green-100 text-green-700",
      expired: "bg-red-100 text-red-700",
      cancelled: "bg-slate-100 text-slate-500",
    }
    const labels: Record<string, string> = {
      pending: "Pendiente", active: "Activa", expired: "Vencida", cancelled: "Cancelada",
    }
    return <Badge className={styles[status]}>{labels[status] || status}</Badge>
  }

  const amount = selectedPlan && pricing[selectedPlan as keyof typeof pricing]
    ? (period === "yearly" ? pricing[selectedPlan as keyof typeof pricing].yearly * 12 : pricing[selectedPlan as keyof typeof pricing].monthly)
    : 0

  if (loading) return <p className="text-sm text-muted-foreground">Cargando...</p>

  return (
    <div className="space-y-6">
      {/* Current plan status */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
                <Crown className="size-6 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold">Plan {planLabels[storePlan] || "Gratis"}</p>
                <p className="text-xs text-muted-foreground">{planDescriptions[storePlan] || ""}</p>
              </div>
            </div>
            {active ? (
              <div className="text-right">
                {statusBadge("active")}
                {active.endDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Vence: {format(new Date(active.endDate), "dd/MM/yyyy", { locale: es })}
                  </p>
                )}
              </div>
            ) : storePlan === "free" ? (
              <Button size="sm" className="gap-2" onClick={() => setShowForm(!showForm)}>
                <Crown className="size-4" /> Actualizar plan
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Upgrade form */}
      {showForm && (
        <Card>
          <CardHeader><CardTitle>Solicitar cambio de plan</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecciona el plan al que deseas migrar. Realiza el pago por transferencia o Pago Móvil a las cuentas indicadas y sube el comprobante. El administrador verificará y activará tu plan.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Plan deseado</Label>
                <Select value={selectedPlan} onValueChange={(v) => v && setSelectedPlan(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Básico — ${pricing.basic.monthly.toFixed(2)}/mes</SelectItem>
                    <SelectItem value="advanced">Avanzado — ${pricing.advanced.monthly.toFixed(2)}/mes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Período de facturación</Label>
                <Select value={period} onValueChange={(v) => v && setPeriod(v as "monthly" | "yearly")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensual — ${pricing[selectedPlan as keyof typeof pricing]?.monthly.toFixed(2)}/mes</SelectItem>
                    <SelectItem value="yearly">Anual — ${pricing[selectedPlan as keyof typeof pricing]?.yearly.toFixed(2)}/mes (ahorra ${(pricing[selectedPlan as keyof typeof pricing]?.monthly * 12 - pricing[selectedPlan as keyof typeof pricing]?.yearly * 12).toFixed(2)}/año)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">Total a pagar</p>
              <p className="text-2xl font-bold text-primary">${amount.toFixed(2)} USD</p>
              {period === "yearly" && <p className="text-xs text-muted-foreground">Facturación anual</p>}
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Método de pago</Label>
              <Select value={paymentMethod} onValueChange={(v) => v && setPaymentMethod(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Transferencia bancaria</SelectItem>
                  <SelectItem value="pago_movil">Pago Móvil</SelectItem>
                  <SelectItem value="zelle">Zelle</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="divisas">Divisas (efectivo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Banco de origen</Label>
                <Select value={bankOrigin} onValueChange={(v) => v && setBankOrigin(v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar banco" /></SelectTrigger>
                  <SelectContent className="max-h-[260px]">
                    {BANKS_VENEZUELA.map((b) => (
                      <SelectItem key={b.code} value={b.code}>
                        <span className="font-mono text-muted-foreground">{b.code}</span> {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Referencia</Label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Número de referencia" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fecha de pago</Label>
              <Popover>
                <PopoverTrigger render={<Button variant="outline" className={cn("w-full justify-start text-left font-normal", !paidAt && "text-muted-foreground")} />}>
                  <CalendarIcon className="size-4" />
                  {paidAt ? format(paidAt, "dd/MM/yyyy", { locale: es }) : "Seleccionar fecha"}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={paidAt} onSelect={(d) => d && setPaidAt(d)} locale={es} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Comprobante de pago</Label>
              <Input type="file" accept="image/*,.pdf" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Enviando..." : "Enviar solicitud"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Historial de pagos</h3>
          {history.map((sub) => (
            <Card key={sub.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {sub.status === "active" ? <CheckCircle2 className="size-5 text-green-600" /> : sub.status === "pending" ? <Clock className="size-5 text-yellow-600" /> : <XCircle className="size-5 text-red-600" />}
                  <div>
                    <p className="text-sm font-medium">Plan {planLabels[sub.plan]} — ${sub.amount.toFixed(2)} USD</p>
                    <p className="text-xs text-muted-foreground">
                      {sub.period === "yearly" ? "Anual" : "Mensual"} · {format(new Date(sub.createdAt), "dd/MM/yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
                {statusBadge(sub.status)}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
