"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Check, CreditCard, Upload, ArrowLeft, Building2, Smartphone, Globe, DollarSign, HandCoins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { BANKS_VENEZUELA } from "@/lib/constants"
import { useSession } from "next-auth/react"

const PLANS: Record<string, { name: string; monthly: number; yearly: number }> = {
  emprendedor: { name: "Emprendedor", monthly: 15, yearly: 150 },
  reservas: { name: "Reservas", monthly: 15, yearly: 150 },
  agenda: { name: "Reservas", monthly: 15, yearly: 150 },
  negocio: { name: "Negocio", monthly: 25, yearly: 250 },
  empresarial: { name: "Empresarial", monthly: 35, yearly: 350 },
  free: { name: "Gratis", monthly: 0, yearly: 0 },
  basico: { name: "Básico", monthly: 15, yearly: 150 },
  basic: { name: "Básico", monthly: 9.99, yearly: 99.99 },
  advanced: { name: "Avanzado", monthly: 19.99, yearly: 199.99 },
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
  paypal: <Globe className="size-5" />,
  zelle: <DollarSign className="size-5" />,
  divisas: <HandCoins className="size-5" />,
}

const TYPE_LABELS: Record<string, string> = {
  bank: "Cuenta Bancaria",
  mobile: "Pago Móvil",
  paypal: "PayPal",
  zelle: "Zelle",
  divisas: "Divisas",
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

  const planKey = searchParams.get("plan") || "basic"
  const period = searchParams.get("period") || "monthly"
  const plan = PLANS[planKey] || PLANS.basic
  const amount = period === "yearly" ? plan.yearly : plan.monthly

  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [selectedMethod, setSelectedMethod] = useState<string>("")
  const [reference, setReference] = useState("")
  const [originBank, setOriginBank] = useState("")
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0])
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!session) return
    fetch("/api/admin-payment-methods")
      .then(r => r.json())
      .then(setMethods)
      .catch(() => toast.error("Error al cargar métodos de pago"))
  }, [session])

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-yellow-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-muted-foreground">Debes iniciar sesión para adquirir un plan.</p>
            <Button onClick={() => router.push("/login")}>Iniciar sesión</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-yellow-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="mx-auto size-16 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="size-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-[#102A43]">Solicitud enviada</h2>
            <p className="text-muted-foreground">Hemos recibido tu solicitud del plan <strong>{plan.name}</strong>. Pronto verificaremos el pago y activaremos tu plan.</p>
            <Button onClick={() => router.push("/dashboard/settings")}>Ir a Configuración</Button>
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

      setSuccess(true)
      toast.success("Solicitud enviada")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-yellow-50">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <button onClick={() => router.push("/pricing")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="size-4" /> Volver a planes
        </button>

        <Card className="mb-6 border-[#FFB92E]/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[#102A43]">{plan.name}</h1>
                <p className="text-muted-foreground">{period === "yearly" ? "Facturación anual" : "Facturación mensual"}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-[#184BBF]">${amount.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{period === "yearly" ? "/año" : "/mes"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">1. Selecciona el método de pago</CardTitle></CardHeader>
            <CardContent>
              {methods.length === 0 ? (
                <p className="text-muted-foreground text-sm">No hay métodos de pago disponibles aún. Contacta al administrador.</p>
              ) : (
                <div className="grid gap-3">
                  {methods.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMethod(m.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                        selectedMethod === m.id ? "border-[#184BBF] bg-[#184BBF]/5 ring-1 ring-[#184BBF]" : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <div className="size-10 rounded-lg bg-[#184BBF]/10 flex items-center justify-center text-[#184BBF]">
                        {TYPE_ICONS[m.type]}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{TYPE_LABELS[m.type]}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.type === "bank" && `${m.bankName} - ${m.accountType} - ${m.accountNumber}`}
                          {m.type === "mobile" && `${m.phoneBank} - ${m.phone} - ${m.accountHolder}`}
                          {(m.type === "paypal" || m.type === "zelle") && m.email}
                          {m.type === "divisas" && (m.bankName || "USD")}
                        </p>
                      </div>
                      {selectedMethod === m.id && <Check className="size-5 text-[#184BBF]" />}
                    </button>
                  ))}
                </div>
              )}

              {selected && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                  <p className="font-medium text-yellow-800 mb-1">Datos para realizar el pago:</p>
                  {selected.type === "bank" && (
                    <ul className="text-yellow-700 space-y-0.5">
                      <li>Banco: {selected.bankName}</li>
                      <li>Tipo: {selected.accountType === "corriente" ? "Corriente" : selected.accountType === "ahorro" ? "Ahorro" : "Jurídica"}</li>
                      <li>Número: <strong>{selected.accountNumber}</strong></li>
                      <li>Titular: {selected.accountHolder}</li>
                      {selected.documentId && <li>RIF/Cédula: {selected.documentId}</li>}
                    </ul>
                  )}
                  {selected.type === "mobile" && (
                    <ul className="text-yellow-700 space-y-0.5">
                      <li>Banco: {selected.phoneBank}</li>
                      <li>Teléfono: <strong>{selected.phone}</strong></li>
                      <li>Titular: {selected.accountHolder}</li>
                    </ul>
                  )}
                  {(selected.type === "paypal" || selected.type === "zelle") && (
                    <p className="text-yellow-700">Envía el pago a: <strong>{selected.email}</strong></p>
                  )}
                  {selected.type === "divisas" && (
                    <p className="text-yellow-700">{selected.bankName || "Contacta al administrador para instrucciones"}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">2. Confirma tu pago</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Banco de origen</Label>
                  <Select value={originBank} onValueChange={(v) => setOriginBank(v ?? "")}>
                    <SelectTrigger><SelectValue placeholder="Tu banco" /></SelectTrigger>
                    <SelectContent>
                      {BANKS_VENEZUELA.map(b => (
                        <SelectItem key={b.code} value={b.code}>{b.code} - {b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Número de referencia</Label>
                  <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ej: 005600" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Fecha del pago</Label>
                  <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Comprobante (opcional)</Label>
                  <Input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full h-12 text-lg" disabled={submitting || methods.length === 0}>
            {submitting ? "Procesando..." : `Pagar $${amount.toFixed(2)}`}
          </Button>
        </form>
      </div>
    </div>
  )
}
