"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { format, differenceInDays } from "date-fns"
import { es } from "date-fns/locale"
import { ArrowLeft, CheckCircle2, XCircle, Building2, CreditCard, DollarSign, FileText, ImageIcon, ExternalLink, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface SubscriptionDetail {
  id: string; plan: string; status: string; amount: number; currency: string; period: string
  startDate: string | null; endDate: string | null; notes: string | null; createdAt: string
  paymentMethod: string | null; reference: string | null; bankOrigin: string | null
  paidAt: string | null; receiptImage: string | null; verifiedAt: string | null
  rejectionReason: string | null; rejectedAt: string | null
  store: { id: string; name: string; slug: string; plan: string; email: string | null; phone: string | null; createdAt: string }
  verifiedBy: { name: string | null; email: string | null } | null
}

const planLabels: Record<string, string> = { basico: "Emprendedor", negocio: "Negocio", empresarial: "Empresarial" }
const planColors: Record<string, string> = { basico: "bg-slate-100 text-slate-700", negocio: "bg-blue-100 text-blue-700", empresarial: "bg-amber-100 text-amber-700" }
const statusLabels: Record<string, string> = { pending: "Pendiente", verified: "Verificada", active: "Activa", expired: "Vencida", cancelled: "Cancelada", rejected: "Rechazada" }
const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700", verified: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700", expired: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500", rejected: "bg-red-100 text-red-700"
}

export default function AdminSubscriptionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [sub, setSub] = useState<SubscriptionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [activating, setActivating] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/subscriptions/${id}`)
      if (!res.ok) { router.push("/admin/subscriptions"); return }
      const data = await res.json()
      setSub(data)
      setNotes(data.notes || "")
      setRejectionReason(data.rejectionReason || "")
      setLoading(false)
    }
    load()
  }, [id, router])

  async function handleActivate() {
    setActivating(true)
    const res = await fetch(`/api/admin/subscriptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "verified", notes, notify: true }),
    })
    if (!res.ok) { toast.error("Error al verificar"); setActivating(false); return }
    const updated = await res.json()
    setSub(updated)
    toast.success("Suscripción verificada exitosamente")
    setActivating(false)
  }

  async function handleReject() {
    if (!rejectionReason.trim()) { toast.error("Debes indicar el motivo del rechazo"); return }
    setRejecting(true)
    const res = await fetch(`/api/admin/subscriptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected", notes, rejectionReason, notify: true }),
    })
    if (!res.ok) { toast.error("Error al rechazar"); setRejecting(false); return }
    const updated = await res.json()
    setSub(updated)
    toast.success("Suscripción rechazada")
    setRejecting(false)
    setShowRejectForm(false)
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Cargando...</div>
  if (!sub) return null

  const isPending = sub.status === "pending"

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/subscriptions">
          <Button variant="ghost" size="icon"><ArrowLeft className="size-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Detalle de Suscripción</h1>
          <p className="text-sm text-muted-foreground">{sub.store.name}</p>
        </div>
        <Badge className={cn("ml-auto", statusColors[sub.status] || "bg-slate-100")}>{statusLabels[sub.status] || sub.status}</Badge>
      </div>

      {sub.rejectionReason && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
          <AlertTriangle className="size-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">Motivo del rechazo</p>
            <p className="text-sm text-red-700">{sub.rejectionReason}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="size-4" /> Tienda</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Nombre</span><span className="font-medium">{sub.store.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Slug</span><span className="font-mono text-xs">{sub.store.slug}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Plan actual</span><Badge className={cn("font-medium", planColors[sub.store.plan] || "bg-slate-100")}>{planLabels[sub.store.plan as keyof typeof planLabels] || sub.store.plan}</Badge></div>
            {sub.store.email && <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{sub.store.email}</span></div>}
            {sub.store.phone && <div className="flex justify-between"><span className="text-muted-foreground">Teléfono</span><span>{sub.store.phone}</span></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="size-4" /> Plan solicitado</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><Badge className={cn("font-medium", planColors[sub.plan as keyof typeof planColors] || "bg-slate-100")}>{planLabels[sub.plan as keyof typeof planLabels] || sub.plan}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Monto</span><span className="font-mono font-bold text-lg">{sub.currency === "USD" ? "$" : "Bs."}{sub.amount.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Período</span><span>{sub.period === "yearly" ? "Anual" : "Mensual"}</span></div>
            {sub.startDate && <div className="flex justify-between"><span className="text-muted-foreground">Inicio</span><span>{format(new Date(sub.startDate), "dd/MM/yyyy", { locale: es })}</span></div>}
            {sub.endDate && (() => {
  const daysLeft = differenceInDays(new Date(sub.endDate), new Date())
  const isExpired = daysLeft < 0
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">Vence</span>
      <span className={isExpired ? "text-red-500" : daysLeft <= 7 ? "text-amber-500" : ""}>
        {isExpired
          ? `Vencido hace ${Math.abs(daysLeft)} día${Math.abs(daysLeft) !== 1 ? "s" : ""}`
          : `Faltan ${daysLeft} día${daysLeft !== 1 ? "s" : ""} · ${format(new Date(sub.endDate), "dd/MM/yyyy", { locale: es })}`
        }
      </span>
    </div>
  )
})()}
          </CardContent>
        </Card>
      </div>

      {sub.paymentMethod && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSign className="size-4" /> Información de pago</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Método</span><span>{sub.paymentMethod === "bank_transfer" ? "Transferencia" : sub.paymentMethod === "pago_movil" ? "Pago Móvil" : sub.paymentMethod === "binancepay" ? "Binance Pay" : sub.paymentMethod}</span></div>
            {sub.bankOrigin && <div className="flex justify-between"><span className="text-muted-foreground">Banco origen</span><span className="font-mono text-xs">{sub.bankOrigin}</span></div>}
            {sub.reference && <div className="flex justify-between"><span className="text-muted-foreground">Referencia</span><span className="font-mono text-xs">{sub.reference}</span></div>}
            {sub.paidAt && <div className="flex justify-between"><span className="text-muted-foreground">Pagado el</span><span>{format(new Date(sub.paidAt), "dd/MM/yyyy hh:mm a", { locale: es })}</span></div>}
            {sub.receiptImage && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-2">Comprobante:</p>
                <a href={sub.receiptImage} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline text-sm">
                  <ImageIcon className="size-4" /> Ver comprobante <ExternalLink className="size-3" />
                </a>
              </div>
            )}
            {sub.verifiedAt && <div className="flex justify-between pt-2 border-t"><span className="text-muted-foreground">Verificado por</span><span>{sub.verifiedBy?.name || sub.verifiedBy?.email || "—"}</span></div>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="size-4" /> Notas internas</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas internas sobre esta suscripción..." rows={3} />
        </CardContent>
      </Card>

      {isPending && !showRejectForm && (
        <div className="flex gap-3 justify-end">
          <Button variant="outline" className="gap-2 text-red-600 border-red-200 hover:bg-red-50" onClick={() => setShowRejectForm(true)}>
            <XCircle className="size-4" /> Rechazar
          </Button>
          <Button className="gap-2" onClick={handleActivate} disabled={activating}>
            <CheckCircle2 className="size-4" /> {activating ? "Verificando..." : "Verificar y activar"}
          </Button>
        </div>
      )}

      {isPending && showRejectForm && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader><CardTitle className="text-base flex items-center gap-2 text-red-700"><AlertTriangle className="size-4" /> Rechazar suscripción</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Motivo del rechazo (obligatorio)..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setShowRejectForm(false); setRejectionReason("") }}>Cancelar</Button>
              <Button variant="destructive" size="sm" className="gap-2" onClick={handleReject} disabled={rejecting}>
                <XCircle className="size-4" /> {rejecting ? "Rechazando..." : "Confirmar rechazo"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
