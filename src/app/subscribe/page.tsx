"use client"
import posthog from "posthog-js"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Check, CreditCard, Upload, ArrowLeft, Building2, Smartphone, Globe, DollarSign, Banknote, Loader2, Receipt, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { BANKS_VENEZUELA } from "@/lib/constants"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { formatBCV } from "@/lib/bcv/format"

const PLANS: Record<string, { name: string; monthly: number; yearly: number; installmentAmount: number; installmentTotal: number }> = {
  agenda: { name: "Agenda", monthly: 15, yearly: 150, installmentAmount: 9, installmentTotal: 18 },
  comercio: { name: "Emprendedor", monthly: 25, yearly: 250, installmentAmount: 14, installmentTotal: 28 },
  mayorista: { name: "Mayorista", monthly: 45, yearly: 450, installmentAmount: 25, installmentTotal: 50 },
  emprendedor: { name: "Emprendedor", monthly: 25, yearly: 250, installmentAmount: 14, installmentTotal: 28 },
  negocio: { name: "Emprendedor", monthly: 25, yearly: 250, installmentAmount: 14, installmentTotal: 28 },
  empresarial: { name: "Mayorista", monthly: 45, yearly: 450, installmentAmount: 25, installmentTotal: 50 },
  basico: { name: "Agenda", monthly: 15, yearly: 150, installmentAmount: 9, installmentTotal: 18 },
  basic: { name: "Agenda", monthly: 15, yearly: 150, installmentAmount: 9, installmentTotal: 18 },
  advanced: { name: "Emprendedor", monthly: 25, yearly: 250, installmentAmount: 14, installmentTotal: 28 },
  free: { name: "Agenda", monthly: 15, yearly: 150, installmentAmount: 9, installmentTotal: 18 },
  reservas: { name: "Agenda", monthly: 15, yearly: 150, installmentAmount: 9, installmentTotal: 18 },
}

type PaymentMethod = {
  id: string
  type: string
  bankName: string | null
  bankCode: string | null
  accountType: string | null
  accountNumber: string | null
  accountHolder: string | null
  documentId: string | null
  phone: string | null
  phoneBank: string | null
  email: string | null
  isActive: boolean
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  bank: <Building2 className="size-5" />,
  mobile: <Smartphone className="size-5" />,
  binancepay: <Wallet className="size-5" />,
  punto_de_venta: <CreditCard className="size-5" />,
}

const TYPE_LABELS: Record<string, string> = {
  bank: "Cuenta Bancaria",
  mobile: "Pago Móvil",
  binancepay: "Binance Pay",
  punto_de_venta: "Punto de Venta",
}

function formatBolivares(usd: number, rate: number): string {
  const bs = usd * rate
  return new Intl.NumberFormat("es-VE", { style: "currency", currency: "VES", maximumFractionDigits: 2 }).format(bs)
}

export default function SubscribePage() {
  return (
    <Suspense fallback={null}>
      <SubscribeContent />
    </Suspense>
  )
}

function SubscribeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()

  const planKey = searchParams.get("plan") || "agenda"
  const period = searchParams.get("period") || "monthly"
  const paymentMode = searchParams.get("paymentMode") || "single"
  const plan = PLANS[planKey] || PLANS.agenda
  const isInstallment = paymentMode === "installment" && period === "monthly"
  const amount = isInstallment ? plan.installmentAmount : period === "yearly" ? plan.yearly : plan.monthly
  const totalLabel = isInstallment ? `/cuota (${plan.installmentTotal} total)` : period === "yearly" ? "/año" : "/mes"

  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [selectedMethod, setSelectedMethod] = useState<string>("")
  const [reference, setReference] = useState("")
  const [originBank, setOriginBank] = useState("")
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0])
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [bcvRate, setBcvRate] = useState<number | null>(null)
  const [bcvLoading, setBcvLoading] = useState(true)
  const nextInstallmentDate = isInstallment
    ? new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
    : null

  useEffect(() => {
    if (!session) return
    fetch("/api/admin-payment-methods")
      .then(r => r.json())
      .then(setMethods)
      .catch(() => toast.error("Error al cargar métodos de pago"))
  }, [session])

  useEffect(() => {
    fetch("/api/bcv")
      .then(r => r.json())
      .then(data => { if (data.rate) setBcvRate(data.rate) })
      .catch(() => {})
      .finally(() => setBcvLoading(false))
  }, [])

  if (!session) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#071A33] via-[#0D2B4A] to-[#071A33]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#0066FF15,_transparent_50%),radial-gradient(ellipse_at_bottom_left,_#FFD60010,_transparent_50%)]" />
        <Card className="relative w-full max-w-md backdrop-blur-xl bg-white/80 border border-white/20 shadow-2xl">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-muted-foreground">Debes iniciar sesión para adquirir un plan.</p>
            <Button onClick={() => router.push("/login")} className="bg-gradient-to-r from-[#0066FF] to-[#0044CC] text-white">Iniciar sesión</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#071A33] via-[#0D2B4A] to-[#071A33]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#0066FF15,_transparent_50%),radial-gradient(ellipse_at_bottom_left,_#FFD60010,_transparent_50%)]" />
        <Card className="relative w-full max-w-md backdrop-blur-xl bg-white/80 border border-white/20 shadow-2xl">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="mx-auto size-16 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="size-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-[#102A43]">Solicitud enviada</h2>
            <p className="text-muted-foreground">Hemos recibido tu solicitud del plan <strong>{plan.name}</strong> ({isInstallment ? `${plan.installmentAmount} cuota inicial` : "pago único"}). Pronto verificaremos el pago y activaremos tu plan.</p>
            <Button onClick={() => router.push("/dashboard/settings")} className="bg-gradient-to-r from-[#0066FF] to-[#0044CC] text-white">Ir a Configuración</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const selected = methods.find(m => m.id === selectedMethod)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedMethod || !reference.trim()) {
      toast.error("Selecciona un método de pago y escribe la referencia")
      return
    }

    setSubmitting(true)
    try {
      let receiptImage = null
      if (file) {
        const fd = new FormData()
        fd.append("file", file)
        const uploadRes = await fetch("/api/upload", { method: "POST", body: fd })
        if (!uploadRes.ok) throw new Error("Error al subir comprobante")
        const uploadData = await uploadRes.json()
        receiptImage = uploadData.url
      }

      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planKey,
          period,
          paymentMode: isInstallment ? "installment" : "single",
          paymentMethod: selected?.type || "bank_transfer",
          reference: reference.trim(),
          bankOrigin: originBank || null,
          paidAt: paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString(),
          receiptImage,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al procesar")
      }

      posthog.capture("subscription_payment_submitted", {
        plan: planKey,
        period,
        payment_mode: isInstallment ? "installment" : "single",
        amount,
        payment_method_type: selected?.type || null,
      })
      setSuccess(true)
      toast.success("Solicitud enviada")
    } catch (error: any) {
      posthog.captureException(error)
      toast.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#071A33] via-[#0D2B4A] to-[#071A33]">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#0066FF15,_transparent_50%),radial-gradient(ellipse_at_bottom_left,_#FFD60010,_transparent_50%)]" />
      <div className="pointer-events-none absolute -top-40 -right-40 size-[500px] rounded-full bg-[#0066FF]/[0.04] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 size-[600px] rounded-full bg-[#FFD600]/[0.03] blur-3xl" />

      <div className="relative mx-auto max-w-2xl px-4 py-10">
        <button onClick={() => router.push("/choose-plan")} className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors mb-6 group">
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          Volver a planes
        </button>

        {/* Plan summary with BCV rate */}
        <div className="relative mb-6 p-6 rounded-2xl backdrop-blur-xl bg-white/10 border border-white/15 shadow-xl shadow-black/10">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Plan seleccionado</p>
              <h1 className="mt-1 text-2xl font-bold text-white">{plan.name}</h1>
              <p className="text-sm text-white/50">{isInstallment ? "2 cuotas · Pago inicial" : period === "yearly" ? "Facturación anual" : "Facturación mensual"}</p>
              {isInstallment && (
                <p className="mt-1 text-xs text-white/30 font-mono">Sgte. cuota: {nextInstallmentDate} · ${plan.installmentAmount.toFixed(2)}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white/50">${amount.toFixed(2)} <span className="text-[10px] text-white/30 font-normal">{totalLabel}</span></p>
              <div className="mt-1">
                {bcvLoading ? (
                  <Loader2 className="size-3 animate-spin text-white/30 ml-auto" />
                ) : bcvRate ? (
                  <p className="text-xl font-bold text-[#FFD600] font-mono tracking-tight">Bs. {formatBolivares(amount, bcvRate)}</p>
                ) : null}
              </div>
            </div>
          </div>
          {bcvRate && (
            <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center">
              <span className="text-[10px] text-white/30 font-mono">Tasa BCV: Bs. {formatBCV(bcvRate)} / USD</span>
              <span className="text-[10px] text-white/30 font-mono">Total en bolívares: Bs. {formatBolivares(amount, bcvRate)}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Payment method */}
          <div className="relative p-6 rounded-2xl backdrop-blur-xl bg-white/10 border border-white/15 shadow-xl shadow-black/10">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-5">
                <span className="flex size-7 items-center justify-center rounded-full bg-[#0066FF]/20 text-[10px] font-bold text-[#0066FF]">1</span>
                <h2 className="text-base font-semibold text-white">Selecciona el método de pago</h2>
              </div>

              {methods.length === 0 ? (
                <p className="text-white/50 text-sm">No hay métodos de pago disponibles aún. Contacta al administrador.</p>
              ) : (
                <div className="grid gap-3">
                  {methods.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMethod(m.id)}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-200",
                        selectedMethod === m.id
                          ? "border-[#0066FF]/50 bg-[#0066FF]/10 ring-1 ring-[#0066FF]/30 backdrop-blur-sm"
                          : "border-white/10 bg-white/5 hover:bg-white/[0.08] hover:border-white/20"
                      )}
                    >
                      <div className="size-11 rounded-xl bg-[#0066FF]/15 flex items-center justify-center text-[#0066FF] shrink-0">
                        {TYPE_ICONS[m.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-white">{TYPE_LABELS[m.type]}</p>
                        <p className="text-xs text-white/50 truncate">
                          {m.type === "bank" && `${m.bankName} - ${m.accountType} - ${m.accountNumber}`}
                          {m.type === "mobile" && `${m.phoneBank} - ${m.phone} - ${m.accountHolder}`}
                          {m.type === "binancepay" && m.email}
                          {m.type === "punto_de_venta" && `${m.bankName} · ${m.accountHolder}`}
                        </p>
                      </div>
                      {selectedMethod === m.id && (
                        <div className="size-6 rounded-full bg-[#0066FF] flex items-center justify-center shrink-0">
                          <Check className="size-3.5 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {selected && (
                <div className="mt-4 p-4 rounded-xl backdrop-blur-sm bg-[#FFD600]/10 border border-[#FFD600]/20">
                  <p className="font-medium text-[#FFD600] text-sm mb-2">Datos para realizar el pago:</p>
                  {selected.type === "bank" && (
                    <ul className="text-white/70 text-xs space-y-1">
                      <li>Banco: <span className="text-white/90">{selected.bankName}</span></li>
                      <li>Tipo: <span className="text-white/90">{selected.accountType === "corriente" ? "Corriente" : selected.accountType === "ahorro" ? "Ahorro" : "Jurídica"}</span></li>
                      <li>Número: <strong className="text-white">{selected.accountNumber}</strong></li>
                      <li>Titular: <span className="text-white/90">{selected.accountHolder}</span></li>
                      {selected.documentId && <li>RIF/Cédula: <span className="text-white/90">{selected.documentId}</span></li>}
                    </ul>
                  )}
                  {selected.type === "mobile" && (
                    <ul className="text-white/70 text-xs space-y-1">
                      <li>Banco: <span className="text-white/90">{selected.phoneBank}</span></li>
                      <li>Teléfono: <strong className="text-white">{selected.phone}</strong></li>
                      <li>Titular: <span className="text-white/90">{selected.accountHolder}</span></li>
                    </ul>
                  )}
                  {selected.type === "binancepay" && (
                    <p className="text-white/70 text-xs">Envía el pago a: <strong className="text-white">{selected.email}</strong></p>
                  )}
                  {selected.type === "punto_de_venta" && (
                    <ul className="text-white/70 text-xs space-y-1">
                      <li>Banco: <span className="text-white/90">{selected.bankName}</span></li>
                      <li>Punto: <strong className="text-white">{selected.accountHolder}</strong></li>
                    </ul>
                  )}
                  {bcvRate && selected.type === "bank" && (
                    <p className="mt-2 pt-2 border-t border-white/10 text-[10px] text-white/40 font-mono">
                      Monto a transferir: <strong className="text-white">${amount.toFixed(2)} USD</strong> ≈ <strong className="text-white">Bs. {formatBolivares(amount, bcvRate)}</strong>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Confirm payment */}
          <div className="relative p-6 rounded-2xl backdrop-blur-xl bg-white/10 border border-white/15 shadow-xl shadow-black/10">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-5">
                <span className="flex size-7 items-center justify-center rounded-full bg-[#0066FF]/20 text-[10px] font-bold text-[#0066FF]">2</span>
                <h2 className="text-base font-semibold text-white">Confirma tu pago</h2>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-white/50">Banco de origen</Label>
                    <Select value={originBank} onValueChange={(v) => setOriginBank(v ?? "")}>
                      <SelectTrigger
                        className={cn(
                          "h-11 w-full rounded-xl backdrop-blur-md bg-white/10 border border-white/15 text-white",
                          "focus-visible:border-[#0066FF]/50 focus-visible:ring-[#0066FF]/20",
                          "data-placeholder:text-white/40 [&_svg]:text-white/40"
                        )}
                      >
                        <SelectValue placeholder="Selecciona tu banco" />
                      </SelectTrigger>
                      <SelectContent
                        className={cn(
                          "backdrop-blur-2xl bg-[#0D2B4A]/95 border border-white/20 text-white shadow-2xl shadow-black/30",
                          "[&_[data-slot=select-item]]:text-white/80 [&_[data-slot=select-item]:focus]:bg-white/10 [&_[data-slot=select-item]:focus]:text-white"
                        )}
                      >
                        {BANKS_VENEZUELA.map(b => (
                          <SelectItem key={b.code} value={b.code} className="py-2.5 px-3 text-sm">{b.code} - {b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-white/50">Número de referencia</Label>
                    <Input
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Ej: 005600"
                      minLength={6}
                      className="h-11 rounded-xl backdrop-blur-md bg-white/10 border border-white/15 text-white placeholder:text-white/30 focus-visible:border-[#0066FF]/50 focus-visible:ring-[#0066FF]/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-white/50">Fecha del pago</Label>
                    <Input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="h-11 rounded-xl backdrop-blur-md bg-white/10 border border-white/15 text-white focus-visible:border-[#0066FF]/50 focus-visible:ring-[#0066FF]/20 [&::-webkit-calendar-picker-indicator]:invert"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-white/50">Comprobante (opcional)</Label>
                    <label
                      className={cn(
                        "flex items-center gap-3 h-11 px-4 rounded-xl cursor-pointer transition-all duration-200",
                        "backdrop-blur-md bg-white/10 border border-white/15",
                        "hover:bg-white/15 hover:border-white/25",
                        file ? "border-[#0066FF]/40 bg-[#0066FF]/10" : ""
                      )}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Receipt className="size-4 text-white/40 shrink-0" />
                        <span className="text-sm truncate text-white/60">
                          {file ? file.name : "Seleccionar comprobante"}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-[#0066FF] shrink-0">
                        {file ? "Cambiar" : "Examinar"}
                      </span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting || methods.length === 0}
            className={cn(
              "relative w-full h-13 text-base font-semibold rounded-xl overflow-hidden transition-all duration-300",
              "bg-gradient-to-r from-[#0066FF] to-[#0044CC] text-white",
              "hover:shadow-[0_0_30px_rgba(0,102,255,0.3)] hover:scale-[1.01] active:scale-[0.99]",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            )}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {submitting ? (
                <><Loader2 className="size-4 animate-spin" /> Procesando...</>
              ) : isInstallment ? (
                <>Pagar 1ra cuota · ${amount.toFixed(2)}</>
              ) : (
                <>Pagar ${amount.toFixed(2)}</>
              )}
            </span>
          </Button>
        </form>
      </div>
    </div>
  )
}
