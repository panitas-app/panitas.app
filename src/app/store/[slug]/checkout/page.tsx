"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckoutSteps } from "@/components/store/checkout-steps"
import { BANKS_VENEZUELA, DOCUMENT_TYPES } from "@/lib/constants"
import { formatAccountNumber, validateReference, validatePhone, isMobilePayment } from "@/lib/ve-banks"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  CalendarIcon,
  ChevronLeftIcon,
  CheckIcon,
  Building2Icon,
  TruckIcon,
  StoreIcon,
  UploadIcon,
  ChevronRightIcon,
  PhoneIcon,
  UserIcon,
  MailIcon,
  HomeIcon,
  BanknoteIcon,
  SmartphoneIcon,
  ShoppingBag,
  CreditCard,
  MapPin,
  ClipboardList,
  Sparkles,
  X,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import confetti from "canvas-confetti"

interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  image?: string | null
}

interface CheckoutData {
  cart: CartItem[]
  storeSlug: string
}

interface PaymentAccount {
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
}

interface StoreInfo {
  id: string
  name: string
  slug: string
  description: string | null
  logo: string | null
  address: string | null
  whatsapp: string | null
  phone: string | null
  primaryColor: string
  paymentAccounts: PaymentAccount[]
  bcvRate: number
  shippingCost?: number
  freeShippingActive?: boolean
  freeShippingMinAmount?: number
}

const MANUAL_OPTION = "Otra Oficina (Escribir Dirección Manualmente)"

const stepIcons = [ShoppingBag, MapPin, UserIcon, ClipboardList, CreditCard]

const stepVariants = {
  enter: { opacity: 0, x: 60 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -60 },
}

function fireConfetti() {
  const duration = 2000
  const end = Date.now() + duration
  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ["#FFB92E", "#184BBF", "#102A43"],
    })
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ["#FFB92E", "#184BBF", "#102A43"],
    })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
}

export default function CheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string

  const [step, setStep] = useState(1)
  const [store, setStore] = useState<StoreInfo | null>(null)
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null)

  // Agency states loaded dynamically
  const [availableEstados, setAvailableEstados] = useState<string[]>([])
  const [empresasForState, setEmpresasForState] = useState<string[]>([])
  const [agenciesForSelection, setAgenciesForSelection] = useState<Array<{ value: string; label: string; agencia: string; ciudad: string; direccion: string; telefono1: string; telefono2: string }>>([])

  const [shippingMethod, setShippingMethod] = useState<string>("")
  const [shippingAgency, setShippingAgency] = useState("")
  const [shippingState, setShippingState] = useState("")
  const [selectedOffice, setSelectedOffice] = useState("")
  const [shippingAgencyAddress, setShippingAgencyAddress] = useState("")
  const [deliveryAddress, setDeliveryAddress] = useState("")

  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")
  const [customerCity, setCustomerCity] = useState("")
  const [customerState, setCustomerState] = useState("")

  const [selectedPaymentAccount, setSelectedPaymentAccount] = useState<string | null>(null)
  const [originBank, setOriginBank] = useState("")
  const [referenceNumber, setReferenceNumber] = useState("")
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(undefined)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [binanceAccountName, setBinanceAccountName] = useState("")
  const [binanceEmailId, setBinanceEmailId] = useState("")

  const [submitted, setSubmitted] = useState(false)
  const [orderNumber, setOrderNumber] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [celebrated, setCelebrated] = useState(false)
  const [couponCode, setCouponCode] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; code: string; discount: number; type: string; value: number } | null>(null)
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponError, setCouponError] = useState("")
  const [couponLoading, setCouponLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/stores/${slug}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        setStore(data)
        // Validate cart items against actual store products
        if (data?.products) {
          try {
            const raw = localStorage.getItem(`panitas_checkout_${slug}`)
            if (raw) {
              const parsed = JSON.parse(raw) as CheckoutData
              if (parsed.storeSlug === slug) {
                const validProductIds = new Set(data.products.map((p: any) => p.id))
                const filtered = parsed.cart.filter((item) => validProductIds.has(item.productId))
                if (filtered.length !== parsed.cart.length) {
                  const updated = { ...parsed, cart: filtered }
                  localStorage.setItem(`panitas_checkout_${slug}`, JSON.stringify(updated))
                  setCheckoutData(updated)
                  if (filtered.length === 0) {
                    toast.error("Los productos en tu carrito ya no están disponibles")
                  } else {
                    toast.warning("Algunos productos fueron eliminados del carrito porque ya no están disponibles")
                  }
                } else {
                  setCheckoutData(parsed)
                }
              }
            }
          } catch (e) { console.error("[unhandled error]", e) }
        }
      })
      .catch(() => {})

    fetch("/api/agencias")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.estados) setAvailableEstados(data.estados)
      })
      .catch(() => {})

    try {
      const raw = localStorage.getItem(`panitas_checkout_${slug}`)
      if (raw) {
        const data = JSON.parse(raw) as CheckoutData
        if (data.storeSlug === slug) setCheckoutData(data)
      }
    } catch (e) { console.error("[unhandled error]", e) }
  }, [slug])

  useEffect(() => {
    if (submitted && !celebrated) {
      setCelebrated(true)
      fireConfetti()
    }
  }, [submitted, celebrated])

  // Cargar empresas de forma dinámica al seleccionar un estado
  useEffect(() => {
    if (!shippingState) {
      setEmpresasForState([])
      setShippingAgency("")
      setSelectedOffice("")
      setShippingAgencyAddress("")
      return
    }

    fetch(`/api/agencias?estado=${encodeURIComponent(shippingState)}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.empresas) {
          setEmpresasForState(data.empresas)
        }
      })
      .catch(() => {})
  }, [shippingState])

  // Cargar oficinas de forma dinámica al elegir estado y empresa
  useEffect(() => {
    if (!shippingState || !shippingAgency) {
      setAgenciesForSelection([])
      setSelectedOffice("")
      setShippingAgencyAddress("")
      return
    }

    fetch(`/api/agencias?estado=${encodeURIComponent(shippingState)}&empresa=${encodeURIComponent(shippingAgency)}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.agencies) {
          const names = data.agencies.map((a: any) => {
            const label = [a.agencia, a.ciudad ? `(${a.ciudad})` : ""].filter(Boolean).join(" ")
            return {
              value: label,
              label,
              agencia: a.agencia,
              ciudad: a.ciudad,
              direccion: a.direccion,
              telefono1: a.telefono1,
              telefono2: a.telefono2
            }
          })
          setAgenciesForSelection([
            ...names,
            { value: MANUAL_OPTION, label: MANUAL_OPTION, agencia: "", ciudad: "", direccion: "", telefono1: "", telefono2: "" }
          ])
        }
      })
      .catch(() => {})
  }, [shippingState, shippingAgency])

  const cart = checkoutData?.cart || []
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const discount = couponDiscount
  
  const isFreeShippingEligible = useMemo(() => {
    if (!store || !store.freeShippingActive) return false
    return subtotal >= (store.freeShippingMinAmount || 0)
  }, [store, subtotal])

  const shippingCost = useMemo(() => {
    if (!store) return 0
    if (shippingMethod === "pickup_store" || !shippingMethod) return 0
    if (isFreeShippingEligible) return 0
    return store.shippingCost || 0
  }, [store, shippingMethod, isFreeShippingEligible])

  const total = Math.max(0, subtotal + shippingCost - discount)
  const bcvRate = store?.bcvRate || 0
  const accentColor = store?.primaryColor || "#FFB92E"

  const selectedAccount = selectedPaymentAccount
    ? store?.paymentAccounts.find((a) => a.id === selectedPaymentAccount)
    : null

  const isPagoMovil = selectedAccount?.type === "mobile"
  const isBinancePay = selectedAccount?.type === "binancepay"

  function handleReceiptFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null
    setReceiptFile(file)
    if (file) {
      const reader = new FileReader()
      reader.onload = () => setReceiptPreview(reader.result as string)
      reader.readAsDataURL(file)
      fireConfetti()
    } else {
      setReceiptPreview(null)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0] || null
    if (file && (file.type.startsWith("image/") || file.type === "application/pdf")) {
      setReceiptFile(file)
      const reader = new FileReader()
      reader.onload = () => setReceiptPreview(reader.result as string)
      reader.readAsDataURL(file)
      fireConfetti()
    } else {
      toast.error("Solo se permiten imágenes o PDF")
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave() {
    setDragging(false)
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      let receiptImageUrl = null

      if (receiptFile) {
        const formData = new FormData()
        formData.append("file", receiptFile)
        const uploadRes = await fetch("/api/checkout/upload-receipt", {
          method: "POST",
          body: formData,
        })
        if (!uploadRes.ok) throw new Error("Error al subir el comprobante de pago")
        const uploadData = await uploadRes.json()
        receiptImageUrl = uploadData.url
      }

      let paymentData = null
      if (selectedPaymentAccount && store) {
        const account = store.paymentAccounts.find((a) => a.id === selectedPaymentAccount)
        let method = "bank_transfer"
        if (account?.type === "mobile") method = "pago_movil"
        else if (account?.type === "binancepay") method = "binancepay"

        paymentData = {
          paymentAccountId: selectedPaymentAccount,
          method,
          amount: total,
          reference: referenceNumber,
          bankOrigin: isBinancePay ? binanceAccountName : originBank,
          paidAt: paymentDate ? paymentDate.toISOString() : new Date().toISOString(),
          receiptImage: receiptImageUrl,
          binanceEmailId: isBinancePay ? binanceEmailId : null,
        }
      }

      const finalAgencyAddress = shippingMethod === "pickup_agency"
        ? (selectedOffice === MANUAL_OPTION
          ? `${shippingState} - ${shippingAgencyAddress}`
          : `${shippingState} - ${selectedOffice}`)
        : null

      const payload = {
        storeId: store?.id,
        currency: "USD",
        shippingCost,
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        customerAddress: customerAddress || null,
        customerCity: customerCity || null,
        customerState: customerState || null,
        shippingMethod,
        shippingAgency: shippingMethod === "pickup_agency" ? shippingAgency : null,
        shippingAgencyAddress: finalAgencyAddress,
        shippingAddress: shippingMethod === "delivery" ? deliveryAddress : null,
        couponId: appliedCoupon?.id || null,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        payment: paymentData,
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        let errorMsg = "Error al procesar el pedido"
        try { const err = await res.json(); errorMsg = err.error || errorMsg } catch (e) { console.error("[unhandled error]", e) }
        throw new Error(errorMsg)
      }

      const order = await res.json()
      setOrderNumber(order.orderNumber)
      setSubmitted(true)

      localStorage.removeItem(`panitas_cart_${slug}`)
      localStorage.removeItem(`panitas_checkout_${slug}`)
      toast.success("¡Pedido enviado con éxito!")
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Hubo un error al procesar tu pedido. Intenta de nuevo.")
    } finally {
      setSubmitting(false)
    }
  }

  const StepIcon = stepIcons[step - 1]

  if (submitted) {
    const getWhatsAppUrl = () => {
      if (!store) return ""
      const phone = store.whatsapp || store.phone || ""
      if (!phone) return ""

      let cleanPhone = phone.replace(/[^0-9]/g, "")
      if (cleanPhone.startsWith("0")) {
        cleanPhone = "58" + cleanPhone.substring(1)
      } else if (!cleanPhone.startsWith("58") && cleanPhone.length === 10) {
        cleanPhone = "58" + cleanPhone
      }
      
      let methodText = "Retiro en Tienda"
      let addressDetails = store.address || ""
      if (shippingMethod === "pickup_agency") {
        methodText = `Envío por Agencia (${shippingAgency})`
        addressDetails = selectedOffice === MANUAL_OPTION ? shippingAgencyAddress : selectedOffice
      } else if (shippingMethod === "delivery") {
        methodText = "Delivery a Domicilio"
        addressDetails = deliveryAddress
      }

      const itemsText = cart
        .map((item) => `- ${item.quantity}x ${item.name} ($${item.price.toFixed(2)} c/u)`)
        .join("\n")

      const paymentMethodText = selectedPaymentAccount
        ? store.paymentAccounts.find((a) => a.id === selectedPaymentAccount)?.type === "mobile"
          ? "Pago Móvil"
          : store.paymentAccounts.find((a) => a.id === selectedPaymentAccount)?.type === "binancepay"
          ? "Binance Pay"
          : "Transferencia Bancaria"
        : "Acordar con vendedor"

      const text = `*Pedido Recibido - ${store.name}*
*Orden Nro:* #${orderNumber}

*Cliente:* ${customerName}
*Teléfono:* ${customerPhone}

*Método de Entrega:* ${methodText}
*Dirección/Detalle:* ${addressDetails}

*Productos:*
${itemsText}

*Resumen de Compra:*
- Subtotal: $${subtotal.toFixed(2)}
- Envío: ${shippingCost === 0 ? "Gratis" : `$${shippingCost.toFixed(2)}`}
- Descuento: $${discount.toFixed(2)}
*Total a Pagar:* $${total.toFixed(2)}
${bcvRate > 0 ? `*Tasa BCV:* Bs. ${bcvRate.toFixed(2)}\n*Total en Bs:* Bs. ${(total * bcvRate).toFixed(2)}` : ""}

*Método de Pago:* ${paymentMethodText}
${referenceNumber ? `*Referencia:* ${referenceNumber}` : ""}
${paymentMethodText === "Binance Pay" ? `*Cuenta origen:* ${binanceAccountName}\n*Email/ID:* ${binanceEmailId}` : ""}

_¡Muchas gracias por su compra!_`

      return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
    }

    const whatsappUrl = getWhatsAppUrl()

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex min-h-screen items-center justify-center p-4"
      >
        <Card className="w-full max-w-md overflow-hidden border-0 shadow-2xl">
          <div className="h-2 bg-gradient-to-r from-[#FFB92E] via-[#184BBF] to-[#102A43]" />
          <CardContent className="flex flex-col items-center gap-5 py-12 px-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.2 }}
              className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-500/30"
            >
              <CheckIcon className="size-10 text-white" />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-2"
            >
              <h1 className="text-2xl font-bold">¡Pedido procesado!</h1>
              <p className="text-sm text-muted-foreground">
                Tu pedido{" "}
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-0.5 font-mono text-sm font-semibold text-primary">
                  <Sparkles className="size-3.5" />
                  {orderNumber}
                </span>{" "}
                ha sido registrado exitosamente.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="space-y-1.5"
            >
              <p className="text-sm text-muted-foreground">
                Para coordinar la entrega y confirmar tu pedido de inmediato, presiona el botón inferior para enviárselo al vendedor por WhatsApp.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="w-full space-y-3"
            >
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-95"
                >
                  <PhoneIcon className="size-4 fill-white" />
                  Enviar pedido por WhatsApp
                </a>
              )}
              
              <Button
                variant="outline"
                className="w-full h-12"
                onClick={() => router.push(`/store/${slug}`)}
              >
                Volver a la tienda
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30" style={{ "--primary": accentColor, "--ring": accentColor } as React.CSSProperties}>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => step === 1 ? router.push(`/store/${slug}`) : setStep(step - 1)}
          >
            <ChevronLeftIcon className="size-4" />
            {step === 1 ? "Volver a la tienda" : "Atrás"}
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-10"
        >
          <CheckoutSteps currentStep={step} />
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Step 1: Verify cart */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                    <ShoppingBag className="size-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Verifica tu compra</h2>
                    <p className="text-xs text-muted-foreground">{cart.length} producto{cart.length !== 1 ? "s" : ""} en tu carrito</p>
                  </div>
                </div>

                {cart.length === 0 ? (
                  <div className="flex flex-col items-center gap-4 py-12 text-center">
                    <div className="flex size-16 items-center justify-center rounded-full bg-muted">
                      <ShoppingBag className="size-8 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">Tu carrito está vacío</p>
                      <p className="text-xs text-muted-foreground">Agrega productos desde la tienda para continuar</p>
                    </div>
                    <Button variant="outline" onClick={() => router.push(`/store/${slug}`)}>
                      Ir a la tienda
                    </Button>
                  </div>
                ) : (
                  <>
                    <Card className="overflow-hidden border-0 shadow-sm">
                      <CardContent className="p-0 divide-y">
                        {cart.map((item) => {
                          const images: string[] = (() => {
                            if (!item.image) return []
                            if (item.image.startsWith("[")) { try { return JSON.parse(item.image) } catch { return [] } }
                            return [item.image]
                          })()
                          return (
                            <div key={item.productId} className="flex items-center gap-4 p-4">
                              <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted shadow-xs">
                                {images[0] ? (
                                  <img src={images[0]} alt={item.name} className="size-full object-cover" />
                                ) : (
                                  <div className="flex size-full items-center justify-center text-xs text-muted-foreground bg-muted/50">Sin img</div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Cant: {item.quantity}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                                <p className="text-[10px] text-muted-foreground">${item.price.toFixed(2)} c/u</p>
                              </div>
                            </div>
                          )
                        })}
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Subtotal</span>
                          <span className="text-lg font-bold">${subtotal.toFixed(2)}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {store?.freeShippingActive && (
                      <div className="rounded-xl border border-dashed p-4 bg-muted/20 space-y-2">
                        {isFreeShippingEligible ? (
                          <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-500">
                            <Sparkles className="size-4 animate-bounce" />
                            <span>¡Calificas para Envío Gratis Nacional!</span>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <p className="text-xs text-muted-foreground font-medium">
                              Agrega <span className="font-bold text-foreground">${((store.freeShippingMinAmount || 0) - subtotal).toFixed(2)}</span> más para obtener <span className="text-primary font-semibold">Envío Gratis Nacional</span>.
                            </p>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all duration-300 rounded-full"
                                style={{ width: `${Math.min(100, (subtotal / (store.freeShippingMinAmount || 1)) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <Button className="w-full h-12 text-base gap-2" onClick={() => setStep(2)}>
                      Confirmar productos
                      <ChevronRightIcon className="size-4" />
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Step 2: Shipping */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                    <MapPin className="size-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Método de envío</h2>
                    <p className="text-xs text-muted-foreground">Selecciona cómo recibir tu pedido</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { value: "pickup_agency", icon: Building2Icon, label: "Envío por agencia", desc: "El cobro del envío se realiza en destino" },
                    { value: "pickup_store", icon: StoreIcon, label: "Retiro en tienda", desc: store?.address || "Dirección no disponible" },
                    { value: "delivery", icon: TruckIcon, label: "Delivery", desc: "Recibe en la puerta de tu casa" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={cn(
                        "relative flex cursor-pointer items-start gap-4 rounded-xl border-2 p-5 transition-all duration-200",
                        shippingMethod === opt.value
                          ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                          : "border-border hover:border-muted-foreground/20 hover:shadow-xs"
                      )}
                    >
                      <input type="radio" name="shipping" value={opt.value} className="sr-only" onChange={() => setShippingMethod(opt.value)} />
                      <div className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        shippingMethod === opt.value ? "border-primary" : "border-muted-foreground/30"
                      )}>
                        {shippingMethod === opt.value && (
                          <motion.div
                            layoutId="shipping-dot"
                            className="size-3 rounded-full bg-primary"
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <opt.icon className={cn("size-4", shippingMethod === opt.value ? "text-primary" : "text-muted-foreground")} />
                          <span className="text-sm font-medium">{opt.label}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {shippingMethod === "pickup_agency" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-4 rounded-xl border bg-card p-5 shadow-xs"
                  >
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Estado</Label>
                        <Select value={shippingState} onValueChange={(v) => {
                          if (v !== null) {
                            setShippingState(v)
                            setShippingAgency("")
                            setSelectedOffice("")
                            setShippingAgencyAddress("")
                          }
                        }}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona tu Estado" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[260px] overflow-y-auto">
                            {availableEstados.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                    </div>

                    {shippingState && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1.5"
                      >
                        <Label className="text-xs font-semibold text-muted-foreground">Empresa de Envío</Label>
                        <Select value={shippingAgency} onValueChange={(v) => {
                          if (v !== null) {
                            setShippingAgency(v)
                            setSelectedOffice("")
                            setShippingAgencyAddress("")
                          }
                        }}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona la Empresa" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[260px] overflow-y-auto">
                            {empresasForState.map((a) => (
                              <SelectItem key={a} value={a}>{a}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </motion.div>
                    )}

                    {shippingState && shippingAgency && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1.5"
                      >
                        <Label className="text-xs font-semibold text-muted-foreground">Agencia / Sucursal</Label>
                        <Select value={selectedOffice} onValueChange={(v) => {
                          if (v !== null) {
                            setSelectedOffice(v)
                            setShippingAgencyAddress("")
                            const sel = agenciesForSelection.find((x) => x.value === v)
                            if (sel && sel.direccion && v !== MANUAL_OPTION) {
                              setShippingAgencyAddress(sel.direccion)
                            }
                          }
                        }}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona la Oficina" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {agenciesForSelection.map((o) => (
                              <SelectItem key={o.value} value={o.value} className="py-3">
                                {o.value === MANUAL_OPTION ? (
                                  <span className="text-sm">{MANUAL_OPTION}</span>
                                ) : (
                                  <div className="space-y-0.5">
                                    <span className="text-sm font-semibold">{o.agencia}</span>
                                    {o.ciudad && <span className="text-xs text-muted-foreground ml-1">({o.ciudad})</span>}
                                    {o.direccion && <p className="text-[11px] text-muted-foreground/70 leading-tight">{o.direccion}</p>}
                                    {o.telefono1 && <p className="text-[11px] text-muted-foreground/70">{o.telefono1}{o.telefono2 ? ` / ${o.telefono2}` : ""}</p>}
                                  </div>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedOffice && selectedOffice !== MANUAL_OPTION && (() => {
                          const sel = agenciesForSelection.find((x) => x.value === selectedOffice)
                          if (!sel || (!sel.direccion && !sel.telefono1)) return null
                          return (
                            <motion.div
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-2 rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-1"
                            >
                              {sel.direccion && <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Dirección:</span> {sel.direccion}</p>}
                              {sel.telefono1 && <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Teléfono:</span> {sel.telefono1}{sel.telefono2 ? ` / ${sel.telefono2}` : ""}</p>}
                            </motion.div>
                          )
                        })()}
                      </motion.div>
                    )}

                    {selectedOffice === MANUAL_OPTION && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1.5"
                      >
                        <Label htmlFor="custom-agency-address" className="text-xs font-semibold text-muted-foreground">
                          Dirección exacta de la oficina
                        </Label>
                        <Input
                          id="custom-agency-address"
                          placeholder="Ej: Av. Principal local Nro. 5, al lado de la plaza"
                          value={shippingAgencyAddress}
                          onChange={(e) => setShippingAgencyAddress(e.target.value)}
                        />
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {shippingMethod === "delivery" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-1.5"
                  >
                    <Label htmlFor="delivery-address">Dirección de entrega</Label>
                    <Textarea
                      id="delivery-address"
                      placeholder="Ej: Av. Principal, Casa Nro. 10, cerca de la plaza"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </motion.div>
                )}

                <Button
                  className="w-full h-12 text-base gap-2"
                  disabled={
                    !shippingMethod ||
                    (shippingMethod === "pickup_agency" && (
                      !shippingState ||
                      !shippingAgency ||
                      !selectedOffice ||
                      (selectedOffice === MANUAL_OPTION && !shippingAgencyAddress.trim())
                    )) ||
                    (shippingMethod === "delivery" && !deliveryAddress.trim())
                  }
                  onClick={() => setStep(3)}
                >
                  Continuar <ChevronRightIcon className="size-4" />
                </Button>
              </div>
            )}

            {/* Step 3: Customer data */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                    <UserIcon className="size-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Datos del comprador</h2>
                    <p className="text-xs text-muted-foreground">Información para contactarte</p>
                  </div>
                </div>

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-5 space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombres y apellidos</Label>
                      <div className="relative">
                        <UserIcon className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="name" className="pl-10 h-11" placeholder="Tu nombre completo" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono</Label>
                      <div className="relative">
                        <PhoneIcon className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="phone" className="pl-10 h-11" placeholder="+58 412-1234567" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                      <div className="relative">
                        <MailIcon className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="email" type="email" className="pl-10 h-11" placeholder="correo@ejemplo.com" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Dirección <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                      <div className="relative">
                        <HomeIcon className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
                        <Textarea id="address" className="pl-10 min-h-[80px]" placeholder="Dirección de residencia" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">Ciudad <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                        <Input id="city" placeholder="Ciudad" value={customerCity} onChange={(e) => setCustomerCity(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">Estado <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                        <Input id="state" placeholder="Estado" value={customerState} onChange={(e) => setCustomerState(e.target.value)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button className="w-full h-12 text-base gap-2" disabled={!customerName || !customerPhone} onClick={() => setStep(4)}>
                  Continuar <ChevronRightIcon className="size-4" />
                </Button>
              </div>
            )}

            {/* Step 4: Summary */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                    <ClipboardList className="size-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Resumen del pedido</h2>
                    <p className="text-xs text-muted-foreground">Revisa que todo esté correcto</p>
                  </div>
                </div>

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-5 space-y-5">
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Productos</h3>
                      <div className="space-y-2">
                        {cart.map((item) => (
                          <div key={item.productId} className="flex items-center justify-between text-sm bg-muted/30 rounded-lg p-3">
                            <div>
                              <span className="font-medium">{item.name}</span>
                              <span className="text-muted-foreground ml-1">x{item.quantity}</span>
                            </div>
                            <span className="font-semibold">${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Envío</h3>
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-sm">
                          {shippingMethod === "pickup_agency" && <>Envío por agencia <span className="font-medium">({shippingAgency})</span></>}
                          {shippingMethod === "pickup_store" && "Retiro en tienda"}
                          {shippingMethod === "delivery" && "Delivery"}
                        </p>
                        {shippingMethod === "pickup_agency" && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {selectedOffice === MANUAL_OPTION
                              ? `${shippingState} - ${shippingAgencyAddress}`
                              : `${shippingState} - ${selectedOffice}`}
                          </p>
                        )}
                        {shippingMethod === "delivery" && <p className="text-xs text-muted-foreground mt-1">{deliveryAddress}</p>}
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Comprador</h3>
                      <div className="bg-muted/30 rounded-lg p-3 space-y-0.5">
                        <p className="text-sm font-medium">{customerName}</p>
                        <p className="text-xs text-muted-foreground">{customerPhone}</p>
                        {customerEmail && <p className="text-xs text-muted-foreground">{customerEmail}</p>}
                        {customerAddress && <p className="text-xs text-muted-foreground">{customerAddress}</p>}
                        {(customerCity || customerState) && (
                          <p className="text-xs text-muted-foreground">{customerCity}{customerCity && customerState ? ", " : ""}{customerState}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-0 shadow-sm">
                  <CardContent className="p-5 space-y-3">
                    {/* Coupon */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Código de cupón"
                        value={couponCode}
                        onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError("") }}
                        disabled={!!appliedCoupon}
                        className="h-9 text-sm"
                      />
                      {appliedCoupon ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 shrink-0"
                          onClick={() => { setAppliedCoupon(null); setCouponDiscount(0); setCouponCode(""); setCouponError("") }}
                        >
                          <X className="size-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 shrink-0"
                          disabled={!couponCode || couponLoading}
                          onClick={async () => {
                            setCouponLoading(true)
                            setCouponError("")
                            try {
                              const res = await fetch("/api/coupons/validate", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ code: couponCode, storeSlug: slug, subtotal }),
                              })
                              const data = await res.json()
                              if (!res.ok) { setCouponError(data.error || "Cupón inválido"); return }
                              setAppliedCoupon({ id: data.couponId, code: couponCode, discount: data.discount, type: data.type, value: data.value })
                              setCouponDiscount(data.discount)
                              toast.success(`Cupón aplicado: ${data.discount > 0 ? "$" + data.discount.toFixed(2) + " de descuento" : "Descuento aplicado"}`)
                            } catch {
                              setCouponError("Error al validar cupón")
                            } finally { setCouponLoading(false) }
                          }}
                        >
                          {couponLoading ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="size-4 rounded-full border-2 border-muted-foreground/30 border-t-foreground" /> : "Aplicar"}
                        </Button>
                      )}
                    </div>
                    {couponError && <p className="text-xs text-destructive">{couponError}</p>}
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    {shippingMethod && shippingMethod !== "pickup_store" && (
                      <div className="flex justify-between text-sm">
                        <span>Costo de envío</span>
                        {shippingCost === 0 ? (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-500">Gratis</span>
                        ) : (
                          <span>${shippingCost.toFixed(2)}</span>
                        )}
                      </div>
                    )}
                    {discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Descuento ({appliedCoupon?.code})</span>
                        <span>-${discount.toFixed(2)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-base font-bold">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                    {bcvRate > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Total en Bs</span>
                        <span>Bs. {(total * bcvRate).toFixed(2)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Button className="w-full h-12 text-base gap-2" onClick={() => setStep(5)}>
                  Proceder al pago <ChevronRightIcon className="size-4" />
                </Button>
              </div>
            )}

            {/* Step 5: Payment */}
            {step === 5 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                    <CreditCard className="size-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Método de pago</h2>
                    <p className="text-xs text-muted-foreground">Selecciona cómo pagar</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {store?.paymentAccounts.map((account) => (
                    <label
                      key={account.id}
                      className={cn(
                        "relative flex cursor-pointer items-start gap-4 rounded-xl border-2 p-5 transition-all duration-200",
                        selectedPaymentAccount === account.id
                          ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                          : "border-border hover:border-muted-foreground/20 hover:shadow-xs"
                      )}
                    >
                      <input type="radio" name="payment" value={account.id} className="sr-only" onChange={() => setSelectedPaymentAccount(account.id)} />
                      <div className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        selectedPaymentAccount === account.id ? "border-primary" : "border-muted-foreground/30"
                      )}>
                        {selectedPaymentAccount === account.id && (
                          <motion.div
                            layoutId="payment-dot"
                            className="size-3 rounded-full bg-primary"
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {account.type === "mobile" ? <SmartphoneIcon className="size-4 text-muted-foreground" /> : <BanknoteIcon className="size-4 text-muted-foreground" />}
                          <span className="text-sm font-medium">{account.bankName}</span>
                          {account.type === "mobile" && <Badge variant="secondary" className="text-[10px]">Pago Móvil</Badge>}
                          {account.bankCode && <Badge variant="outline" className="text-[9px] font-mono">{account.bankCode}</Badge>}
                        </div>
                        {account.type !== "mobile" && (
                          <div className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                            <p>{account.accountType === "corriente" ? "Cuenta Corriente" : account.accountType === "ahorro" ? "Cuenta de Ahorro" : ""}</p>
                            <p className="font-mono text-foreground/70">{formatAccountNumber(account.accountNumber || "")}</p>
                            {account.accountHolder && <p>Titular: {account.accountHolder}</p>}
                            {account.documentId && <p>Doc: {account.documentId}</p>}
                          </div>
                        )}
                        {account.type === "mobile" && (
                          <div className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                            <p className="font-mono">{account.phone}</p>
                            <p>Banco: {account.bankName}</p>
                            <p>Titular: {account.accountHolder}</p>
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                {selectedPaymentAccount && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-5 rounded-xl border-2 bg-card p-5 shadow-sm"
                  >
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <CreditCard className="size-4 text-primary" />
                      {isBinancePay ? "Detalles del pago Binance Pay" : "Detalles de la transferencia"}
                    </h3>

                    {isBinancePay ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>ID de la orden (referencia)</Label>
                          <Input
                            value={referenceNumber}
                            onChange={(e) => setReferenceNumber(e.target.value)}
                            placeholder="ID de la orden"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Nombre de la cuenta (pagaste desde)</Label>
                          <Input
                            value={binanceAccountName}
                            onChange={(e) => setBinanceAccountName(e.target.value)}
                            placeholder="Nombre de tu cuenta Binance"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Correo o ID de Binance</Label>
                          <Input
                            value={binanceEmailId}
                            onChange={(e) => setBinanceEmailId(e.target.value)}
                            placeholder="email@ejemplo.com"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Banco de origen</Label>
                          <Select value={originBank} onValueChange={(v) => v !== null && setOriginBank(v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona tu banco" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[260px] overflow-y-auto">
                              {BANKS_VENEZUELA.map((b) => (
                                <SelectItem key={b.code} value={b.code}>
                                  <span className="font-mono text-muted-foreground">{b.code}</span> {b.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reference">Número de referencia</Label>
                          <Input
                            id="reference"
                            placeholder="Ej: 1234567890 (mín. 6 dígitos)"
                            value={referenceNumber}
                            onChange={(e) => {
                              setReferenceNumber(e.target.value)
                              const v = validateReference(e.target.value)
                              e.target.setCustomValidity(v.valid ? "" : v.error || "")
                            }}
                            inputMode="numeric"
                          />
                          {referenceNumber && !validateReference(referenceNumber).valid && (
                            <p className="text-[10px] text-destructive">{validateReference(referenceNumber).error}</p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 text-center space-y-1">
                      <p className="text-xs text-muted-foreground">Monto a pagar</p>
                      <p className="text-2xl font-bold text-accent">${total.toFixed(2)}</p>
                      {bcvRate > 0 && (
                        <p className="text-sm text-muted-foreground">Bs. {(total * bcvRate).toFixed(2)}</p>
                      )}
                      {discount > 0 && (
                        <p className="text-xs text-green-600">-${discount.toFixed(2)} descuento aplicado</p>
                      )}
                    </div>

                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label>Fecha de pago</Label>
                        <Popover>
                          <PopoverTrigger
                            render={
                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-11", !paymentDate && "text-muted-foreground")} />
                            }
                          >
                            <CalendarIcon className="size-4" />
                            {paymentDate ? format(paymentDate, "dd/MM/yyyy") : "Seleccionar fecha"}
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={paymentDate} onSelect={setPaymentDate} locale={es} />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Comprobante de pago</Label>
                      <div
                        className={cn(
                          "relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all",
                          dragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted/30"
                        )}
                        onClick={() => fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                      >
                        {receiptPreview ? (
                          <div className="relative w-full max-w-xs">
                            <img src={receiptPreview} alt="Comprobante" className="w-full max-h-40 rounded-lg object-contain bg-muted" />
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setReceiptFile(null); setReceiptPreview(null) }}
                              className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-xs"
                            >
                              <X className="size-3" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                              <UploadIcon className="size-6 text-primary" />
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-medium">Haz clic o arrastra tu comprobante</p>
                              <p className="text-xs text-muted-foreground mt-1">PNG, JPG o PDF (máx. 10MB)</p>
                            </div>
                          </>
                        )}
                        <input
                          ref={fileInputRef}
                          id="receipt"
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={handleReceiptFile}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                <Button
                  className="w-full h-12 text-base gap-2"
                  disabled={!selectedPaymentAccount || !referenceNumber || !paymentDate || submitting || (isBinancePay ? (!binanceAccountName || !binanceEmailId) : !originBank)}
                  onClick={handleSubmit}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="size-4 rounded-full border-2 border-white/30 border-t-white"
                      />
                      Procesando...
                    </span>
                  ) : (
                    <>Enviar pedido <ChevronRightIcon className="size-4" /></>
                  )}
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
