"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { DownloadPurchaseOrder } from "@/components/seller/purchase-order"
import {
  CheckCircle,
  MessageCircle,
  ArrowLeft,
  Banknote,
  Calendar,
  Hash,
  User,
  Phone,
  MapPin,
  Package,
  Truck,
  Store,
  Building2,
  ExternalLink,
  ShieldCheck,
  Clock,
  Box,
  CircleCheckBig,
  XCircle,
} from "lucide-react"

interface Payment {
  id: string
  method: string
  amount: number
  reference: string | null
  bankOrigin: string | null
  paidAt: string | null
  receiptImage: string | null
  status: string
  paymentAccount: {
    bankName: string | null
    accountNumber: string | null
    accountHolder: string | null
  } | null
}

interface OrderItem {
  id: string
  quantity: number
  price: number
  subtotal: number
  product: { name: string } | null
}

interface Order {
  id: string
  orderNumber: string
  status: string
  subtotal: number
  discount: number
  shippingCost: number
  total: number
  bcvRateAtOrder: number | null
  paymentStatus: string
  customerId: string | null
  customerName: string
  customerPhone: string
  customerEmail: string | null
  customerAddress: string | null
  customerCity: string | null
  customerState: string | null
  shippingMethod: string
  shippingAgency: string | null
  shippingAgencyAddress: string | null
  shippingAddress: string | null
  clientNotified: boolean
  createdAt: string
  items: OrderItem[]
  payments: Payment[]
  store: { name: string; whatsapp: string | null; email: string | null; phone: string | null }
}

const shippingLabels: Record<string, string> = {
  pickup_agency: "Envío por agencia",
  pickup_store: "Retiro en tienda",
  delivery: "Delivery",
}

const statusOptions = [
  { key: "pending", label: "Pendiente", icon: Clock, color: "bg-yellow-500" },
  { key: "preparing", label: "Empaquetado", icon: Box, color: "bg-blue-500" },
  { key: "shipped", label: "Despachado", icon: CircleCheckBig, color: "bg-green-500" },
]

function getWhatsAppMessage(shippingMethod: string, orderNumber: string, customerName: string): string {
  const base = `Hola ${customerName}, tu pedido *${orderNumber}* ha sido recibido y verificado con éxito.`

  const methodMessages: Record<string, string> = {
    pickup_agency: `${base} En las próximas horas recibirás la guía de envío para que puedas rastrear tu pedido. ¡Gracias por tu compra!`,
    pickup_store: `${base} Coordinemos la hora y el día del retiro para tener tu pedido empaquetado y listo para el despacho. ¿Cuándo te gustaría pasar?`,
    delivery: `${base} Coordinemos la hora y el día de la entrega para que recibas tu pedido. ¿Qué día y hora te queda mejor?`,
  }

  return methodMessages[shippingMethod] || base
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("es-VE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [notifying, setNotifying] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [allAgencies, setAllAgencies] = useState<Array<{ empresa: string; estado: string; ciudad: string; agencia: string; direccion: string; telefono1: string; telefono2: string }>>([])

  const matchedAgency = useMemo(() => {
    if (!order || !order.shippingAgency || !order.shippingAgencyAddress) return null
    const addr = order.shippingAgencyAddress
    const [orderEstado] = addr.split(" - ")
    if (!orderEstado) return null
    return allAgencies.find((a) => {
      const empresaMatch = a.empresa === order.shippingAgency
      const estadoMatch = a.estado === orderEstado
      const agenciaInAddr = addr.toLowerCase().includes(a.agencia.toLowerCase())
      return empresaMatch && estadoMatch && agenciaInAddr
    }) || null
  }, [order, allAgencies])

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { setOrder(data); setLoading(false) })
      .catch(() => setLoading(false))

    fetch("/api/agencias")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data?.agencies) setAllAgencies(data.agencies) })
      .catch(() => {})
  }, [id])

  async function handleVerifyPayment(paymentId: string) {
    setVerifying(true)
    try {
      const res = await fetch(`/api/orders/${id}/verify-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, orderStatus: "pending" }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al verificar el pago")
      }
      const updated = await res.json()
      setOrder(updated)
      setVerified(true)
      toast.success("¡Pago verificado con éxito!")
    } catch (error: any) {
      toast.error(error.message || "Error al verificar el pago")
    } finally {
      setVerifying(false)
    }
  }

  async function handleUpdateStatus(newStatus: string) {
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Error al actualizar el estado")
      }
      const updated = await res.json()
      setOrder(updated)
      toast.success(newStatus === "cancelled" ? "Pedido cancelado y stock restaurado" : `Pedido marcado como "${statusOptions.find((s) => s.key === newStatus)?.label}"`)
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar el estado")
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!order) {
    return <div className="p-8 text-center text-muted-foreground">Pedido no encontrado</div>
  }

  const customerPhoneDigits = order.customerPhone.replace(/[^0-9]/g, "")
  const firstPendingPayment = order.payments.find((p) => p.status === "pending")
  const isAlreadyVerified = order.paymentStatus === "paid" || verified

  return (
    <div className="mx-auto max-w-4xl space-y-6 relative">
      {/* Floating WhatsApp button */}
      <a
        href={`https://wa.me/${customerPhoneDigits}?text=${encodeURIComponent(`Hola ${order.customerName}, te escribo respecto a tu pedido ${order.orderNumber}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-green-500 text-white shadow-xl shadow-green-500/40 hover:bg-green-600 hover:scale-110 transition-all duration-200"
      >
        <MessageCircle className="size-7" />
      </a>

      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/orders")}>
        <ArrowLeft className="size-4" />
        Volver a pedidos
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold flex items-center gap-2">
            Pedido {order.orderNumber}
            <Badge variant="outline" className="text-[10px]">
              {formatDate(order.createdAt)}
            </Badge>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <DownloadPurchaseOrder order={order} />
          <Badge
            variant={order.paymentStatus === "paid" ? "default" : order.paymentStatus === "pending" ? "secondary" : "destructive"}
          >
            {order.paymentStatus === "paid" ? "Pagado" : order.paymentStatus === "pending" ? "Pendiente" : order.paymentStatus}
          </Badge>
          <Badge
            variant={order.status === "confirmed" || order.status === "preparing" || order.status === "shipped" ? "default" : "secondary"}
          >
            {order.status === "pending" ? "Pendiente" : order.status === "preparing" ? "Empaquetado" : order.status === "shipped" ? "Despachado" : order.status === "confirmed" ? "Confirmado" : order.status}
          </Badge>
        </div>
      </div>

      {/* Payment verification card */}
      {firstPendingPayment && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-2 border-[#FFB92E]/30 bg-gradient-to-br from-[#FFB92E]/5 to-[#FFB92E]/10 p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="flex size-12 items-center justify-center rounded-full bg-[#FFB92E]/20">
              <ShieldCheck className="size-6 text-[#FFB92E]" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Verificar pago</h2>
              <p className="text-xs text-muted-foreground">Revisa los datos de la transferencia antes de confirmar</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 mb-5">
            <div className="rounded-xl bg-white/60 p-4 space-y-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Datos de la transferencia</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Banknote className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Monto:</span>
                  <span className="font-bold text-lg">${firstPendingPayment.amount.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Hash className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Referencia:</span>
                  <span className="font-mono font-medium">{firstPendingPayment.reference || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Banco origen:</span>
                  <span className="font-medium">{firstPendingPayment.bankOrigin || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Fecha pago:</span>
                  <span className="font-medium">{firstPendingPayment.paidAt ? formatDate(firstPendingPayment.paidAt) : "N/A"}</span>
                </div>
              </div>
              {firstPendingPayment.receiptImage && (
                <a
                  href={firstPendingPayment.receiptImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  <ExternalLink className="size-3" />
                  Ver comprobante
                </a>
              )}
            </div>

            <div className="rounded-xl bg-white/60 p-4 space-y-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Datos del cliente</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Nombre:</span>
                  {order.customerId ? (
                    <Link href={`/dashboard/customers/${order.customerId}`} className="font-medium text-primary hover:underline">{order.customerName}</Link>
                  ) : (
                    <span className="font-medium">{order.customerName}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Teléfono:</span>
                  <span className="font-medium">{order.customerPhone}</span>
                </div>
                {order.customerEmail && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium text-xs">{order.customerEmail}</span>
                  </div>
                )}
                {order.customerAddress && (
                  <div className="flex items-center gap-2">
                    <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Dirección:</span>
                    <span className="font-medium text-xs">{order.customerAddress}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator className="mb-4" />

          <div className="flex items-center gap-2 mb-5 text-sm">
            {order.shippingMethod === "pickup_agency" && <Truck className="size-4 text-muted-foreground" />}
            {order.shippingMethod === "pickup_store" && <Store className="size-4 text-muted-foreground" />}
            {order.shippingMethod === "delivery" && <MapPin className="size-4 text-muted-foreground" />}
            <span className="text-muted-foreground">Envío:</span>
            <span className="font-medium">{shippingLabels[order.shippingMethod] || order.shippingMethod}</span>
            {order.shippingAgency && <span className="text-muted-foreground">({order.shippingAgency})</span>}
          </div>

          <Button
            size="lg"
            className="w-full gap-2 h-13 text-base font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/30"
            disabled={verifying}
            onClick={() => handleVerifyPayment(firstPendingPayment.id)}
          >
            {verifying ? (
              <span className="flex items-center gap-2">
                <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Verificando...
              </span>
            ) : (
              <>
                <CheckCircle className="size-5" />
                Pago verificado
              </>
            )}
          </Button>
        </motion.div>
      )}

      {/* WhatsApp notification section */}
      {(verified || order.paymentStatus === "paid") && !order.clientNotified && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="size-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-green-800">Pago verificado</h2>
              <p className="text-xs text-green-600">El pago del pedido {order.orderNumber} ha sido verificado</p>
            </div>
          </div>

          <Separator className="mb-4 bg-green-200" />

          <div className="text-sm text-green-700 mb-4 space-y-1">
            <p>Notifica al cliente sobre el estado de su pedido:</p>
            <p className="text-xs text-green-600 mt-2">
              {order.shippingMethod === "pickup_agency" && "El mensaje incluirá que recibirá la guía de envío próximamente."}
              {order.shippingMethod === "delivery" && "El mensaje incluirá coordinar hora y día de la entrega."}
              {order.shippingMethod === "pickup_store" && "El mensaje incluirá coordinar hora y día del retiro."}
            </p>
          </div>

          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full gap-2 h-13 text-base font-bold bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/30"
              onClick={() => {
                const url = `https://wa.me/${customerPhoneDigits}?text=${encodeURIComponent(getWhatsAppMessage(order.shippingMethod, order.orderNumber, order.customerName))}`
                window.open(url, "_blank", "noopener,noreferrer")
              }}
            >
              <MessageCircle className="size-5" />
              Notificar al cliente por WhatsApp
              <ExternalLink className="size-4" />
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full gap-2 h-12 text-base text-muted-foreground border-dashed"
              disabled={notifying}
              onClick={async () => {
                setNotifying(true)
                try {
                  const res = await fetch(`/api/orders/${id}/notify`, { method: "PATCH" })
                  if (res.ok) {
                    const updated = await res.json()
                    setOrder((prev) => prev ? { ...prev, clientNotified: updated.clientNotified } : prev)
                    toast.success("Cliente marcado como notificado")
                  } else {
                    toast.error("Error al guardar")
                  }
                } catch {
                  toast.error("Error al guardar")
                } finally {
                  setNotifying(false)
                }
              }}
            >
              <CheckCircle className="size-4" />
              Ya notifiqué al cliente
            </Button>
          </div>
        </motion.div>
      )}

      {/* Already notified message */}
      {order.clientNotified && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border border-green-200 bg-green-50 p-4 text-center"
        >
          <div className="flex items-center justify-center gap-2 text-sm text-green-700">
            <CheckCircle className="size-4 text-green-500" />
            <span>Cliente notificado correctamente</span>
          </div>
        </motion.div>
      )}

      {/* Order status actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Estado del pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((opt) => {
              const Icon = opt.icon
              const isActive = order.status === opt.key
              return (
                <Button
                  key={opt.key}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  className={`gap-2 rounded-full transition-all ${
                    isActive ? `${opt.color} text-white border-0` : ""
                  }`}
                  disabled={updatingStatus || isActive}
                  onClick={() => handleUpdateStatus(opt.key)}
                >
                  <Icon className="size-3.5" />
                  {opt.label}
                </Button>
              )
            })}
          </div>
          {order.status !== "cancelled" && order.status !== "delivered" && (
            <>
              <Separator className="my-3" />
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  disabled={updatingStatus}
                  onClick={() => {
                    if (confirm("¿Estás seguro de cancelar este pedido? Se restaurará el inventario.")) {
                      handleUpdateStatus("cancelled")
                    }
                  }}
                >
                  <XCircle className="size-3.5" />
                  Cancelar pedido
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Order info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Información del Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Envío</span>
              <span>${order.shippingCost.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span>${order.total.toFixed(2)}</span>
            </div>
            {order.bcvRateAtOrder && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Total en Bs. (tasa del día)</span>
                <span>Bs. {(order.total * order.bcvRateAtOrder).toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex items-center gap-2 pt-1">
              {order.shippingMethod === "pickup_agency" && <Truck className="size-3.5 text-muted-foreground" />}
              {order.shippingMethod === "pickup_store" && <Store className="size-3.5 text-muted-foreground" />}
              {order.shippingMethod === "delivery" && <MapPin className="size-3.5 text-muted-foreground" />}
              <span className="text-muted-foreground">Envío:</span>
              <span className="font-medium">{shippingLabels[order.shippingMethod] || order.shippingMethod}</span>
            </div>
            {order.shippingMethod === "pickup_agency" && matchedAgency ? (
              <div className="mt-2 rounded-xl border-2 border-primary/20 bg-primary/5 p-4 space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Datos de la agencia para el despacho</p>
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2">
                    <Building2 className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold">{matchedAgency.agencia}</p>
                      <p className="text-xs text-muted-foreground">{matchedAgency.empresa} — {matchedAgency.ciudad}, {matchedAgency.estado}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">{matchedAgency.direccion}</p>
                  </div>
                  {(matchedAgency.telefono1 || matchedAgency.telefono2) && (
                    <div className="flex items-start gap-2">
                      <Phone className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-xs">{matchedAgency.telefono1}{matchedAgency.telefono2 ? ` / ${matchedAgency.telefono2}` : ""}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : order.shippingAgencyAddress ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dirección agencia</span>
                <span className="text-right max-w-[200px] text-xs">{order.shippingAgencyAddress}</span>
              </div>
            ) : null}
            {order.shippingAddress && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dirección entrega</span>
                <span className="text-right max-w-[200px] text-xs">{order.shippingAddress}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nombre</span>
              {order.customerId ? (
                <Link href={`/dashboard/customers/${order.customerId}`} className="font-medium text-primary hover:underline">{order.customerName}</Link>
              ) : (
                <span className="font-medium">{order.customerName}</span>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Teléfono</span>
              <span>{order.customerPhone}</span>
            </div>
            {order.customerEmail && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="text-xs">{order.customerEmail}</span>
              </div>
            )}
            {order.customerAddress && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dirección</span>
                <span className="text-right max-w-[200px] text-xs">{order.customerAddress}</span>
              </div>
            )}
            {(order.customerCity || order.customerState) && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ubicación</span>
                <span className="text-xs">{order.customerCity}{order.customerCity && order.customerState ? ", " : ""}{order.customerState}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="size-4" />
            Productos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-6 py-3 text-sm">
                <div>
                  <span className="font-medium">{item.product?.name || "Producto eliminado"}</span>
                  <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                </div>
                <span className="font-semibold">${item.subtotal.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
