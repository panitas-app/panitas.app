"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { DollarSign } from "lucide-react"
import { toast } from "sonner"
import { useBcvRate } from "@/lib/bcv-context"
import Pusher from "pusher-js"
import QRCode from "qrcode"
import { MobileCameraScanner } from "@/components/scanner/mobile-camera-scanner"
import { PosCatalog } from "@/components/pos/pos-catalog"
import { PosTodaySales } from "@/components/pos/pos-today-sales"
import { PosCart } from "@/components/pos/pos-cart"
import { CustomerPicker } from "@/components/pos/customer-picker"
import { ShippingFields } from "@/components/pos/shipping-fields"
import { PaymentModal } from "@/components/pos/payment-modal"
import { ReceiptModal } from "@/components/pos/receipt-modal"
import { DailyReportModal } from "@/components/pos/daily-report-modal"
import { ScannerModal } from "@/components/pos/scanner-modal"
import type { CartItem, Category, CustomerInfo, CustomerResult, PaymentSplit, Product, ScannerStatus, TodaySale } from "@/components/pos/types"

export default function POSPage() {
  const { rate: bcvRate, showBolivares } = useBcvRate()

  // Products
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set())

  // Cart
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartDiscount, setCartDiscount] = useState(0)

  // Customer
  const [customer, setCustomer] = useState<CustomerInfo | null>(null)
  const [customerSearch, setCustomerSearch] = useState("")
  const [customerResults, setCustomerResults] = useState<CustomerResult[]>([])
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState("")
  const [newCustomerPhone, setNewCustomerPhone] = useState("")
  const [newCustomerDocumentId, setNewCustomerDocumentId] = useState("")

  // Shipping
  const [saleType, setSaleType] = useState<"store" | "shipping">("store")
  const [shippingMethod, setShippingMethod] = useState("pickup_agency")
  const [shippingCost, setShippingCost] = useState(0)
  const [customerAddress, setCustomerAddress] = useState("")
  const [customerCity, setCustomerCity] = useState("")
  const [customerState, setCustomerState] = useState("")
  const [shippingAgency, setShippingAgency] = useState("")
  const [shippingAgencyAddress, setShippingAgencyAddress] = useState("")
  const [shippingAddress, setShippingAddress] = useState("")
  // Agencies DB
  const [agenciaEmpresas, setAgenciaEmpresas] = useState<string[]>([])
  const [agenciaEstados, setAgenciaEstados] = useState<string[]>([])
  const [agenciaOficinas, setAgenciaOficinas] = useState<any[]>([])
  const [selectedAgenciaEmpresa, setSelectedAgenciaEmpresa] = useState("")
  const [selectedAgenciaEstado, setSelectedAgenciaEstado] = useState("")
  const [loadingAgencias, setLoadingAgencias] = useState(false)

  // Coupon
  const [couponCode, setCouponCode] = useState("")
  const [couponId, setCouponId] = useState<string | null>(null)
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [applyingCoupon, setApplyingCoupon] = useState(false)

  // Payment modal
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [splitPayments, setSplitPayments] = useState<PaymentSplit[]>([])
  const [cashReceived, setCashReceived] = useState("")
  const [selectedCreditTerm, setSelectedCreditTerm] = useState("")
  const [cuotasCount, setCuotasCount] = useState(3)
  const [downPayment, setDownPayment] = useState("")

  // Receipt modal
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [lastOrder, setLastOrder] = useState<any>(null)

  // Today sales
  const [todaySales, setTodaySales] = useState<TodaySale[]>([])
  const [showTodaySales, setShowTodaySales] = useState(false)

  // Daily report
  const [showDailyReport, setShowDailyReport] = useState(false)
  const [dailyOrders, setDailyOrders] = useState<any[]>([])
  const [dailySummary, setDailySummary] = useState<any>(null)
  const [dailyLoading, setDailyLoading] = useState(false)

  // Loading
  const [submitting, setSubmitting] = useState(false)

  // Scanner
  const [scannerOpen, setScannerOpen] = useState(false)
  const [mobileScannerOpen, setMobileScannerOpen] = useState(false)
  const [scannerSessionId, setScannerSessionId] = useState<string | null>(null)
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>("idle")
  const [scannerDevice, setScannerDevice] = useState<string>("")
  const [scannerQrUrl, setScannerQrUrl] = useState<string | null>(null)
  const [scannerToken, setScannerToken] = useState<string | null>(null)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)
  const pusherRef = useRef<Pusher | null>(null)

  // Scan input ref
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => { fetchProducts(); fetchTodaySales() }, [])

  async function loadDailyReport() {
    setDailyLoading(true)
    setShowDailyReport(true)
    try {
      const res = await fetch("/api/reports/daily")
      if (res.ok) {
        const data = await res.json()
        setDailyOrders(data.orders || [])
        setDailySummary(data)
      }
    } catch (e) { console.error("[unhandled error]", e) }
    setDailyLoading(false)
  }

  async function fetchProducts() {
    try {
      const res = await fetch("/api/products?limit=200")
      const data = await res.json()
      const list = Array.isArray(data) ? data : data.data || []
      setProducts(list)
      const cats = list.filter((p: Product) => p.category).map((p: Product) => p.category)
        .filter((c: Category, i: number, arr: Category[]) => arr.findIndex((x) => x.id === c.id) === i)
      setCategories(cats)
    } catch { toast.error("Error al cargar productos") }
  }

  async function fetchTodaySales() {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const res = await fetch(`/api/orders?status=all&limit=100`)
      if (res.ok) {
        const data = await res.json()
        const list = (data.data || data || []).filter((o: any) => new Date(o.createdAt) >= today)
        setTodaySales(list)
      }
    } catch (e) { console.error("[unhandled error]", e) }
  }

  // SKU Scanner: auto-detect barcode input via rapid Enter key behavior
  const handleSearchChange = useCallback((val: string) => {
    setSearch(val)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      if (!val.trim()) return
      const found = products.find(p => p.sku?.toLowerCase() === val.trim().toLowerCase())
      if (found) { addToCart(found); setSearch("") }
    }, 400)
  }, [products])

  async function searchCustomer(q: string) {
    setCustomerSearch(q)
    if (q.length < 2) { setCustomerResults([]); return }
    try {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}&limit=10`)
      if (res.ok) { const data = await res.json(); setCustomerResults(data.data || []) }
    } catch (e) { console.error("[unhandled error]", e) }
  }

  function selectCustomer(c: CustomerResult) {
    setCustomer({ name: c.name, phone: c.phone, documentId: c.documentId || undefined })
    setCustomerSearch(""); setCustomerResults([]); setShowCustomerSearch(false)
  }

  // Wholesale price calculator
  function calcWholesalePrice(product: Product, qty: number): { price: number; wholesale: boolean } {
    if (!product.isWholesale) return { price: product.price, wholesale: false }
    if (product.wholesaleScales) {
      try {
        const scales = typeof product.wholesaleScales === "string" ? JSON.parse(product.wholesaleScales) : product.wholesaleScales
        if (Array.isArray(scales)) {
          const sorted = [...scales].sort((a: any, b: any) => (b.quantity || 0) - (a.quantity || 0))
          const match = sorted.find((s: any) => qty >= (s.quantity || 0))
          if (match && match.price > 0) return { price: match.price, wholesale: true }
        }
      } catch (e) { console.error("[unhandled error]", e) }
    }
    if (product.wholesalePrice && qty >= 5) return { price: product.wholesalePrice, wholesale: true }
    return { price: product.price, wholesale: false }
  }

  function addToCart(product: Product) {
    if (product.stock <= 0) { toast.error("Producto agotado"); return }
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id)
      if (existing) {
        const newQty = existing.quantity + 1
        if (newQty > product.stock) { toast.error("Stock insuficiente"); return prev }
        const { price, wholesale } = calcWholesalePrice(product, newQty)
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: newQty, price, wholesale, originalPrice: wholesale ? product.price : undefined }
            : item
        )
      }
      const { price, wholesale } = calcWholesalePrice(product, 1)
      return [...prev, { productId: product.id, name: product.name, price, quantity: 1, stock: product.stock, wholesale, originalPrice: wholesale ? product.price : undefined }]
    })
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item
        const newQty = item.quantity + delta
        if (newQty <= 0) return null
        if (newQty > item.stock) { toast.error("Stock insuficiente"); return item }
        const product = products.find(p => p.id === productId)
        if (product) {
          const { price, wholesale } = calcWholesalePrice(product, newQty)
          return { ...item, quantity: newQty, price, wholesale, originalPrice: wholesale ? product.price : undefined }
        }
        return { ...item, quantity: newQty }
      }).filter(Boolean) as CartItem[]
    )
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((item) => item.productId !== productId))
  }

  function setLinePrice(productId: string, newPrice: number) {
    const product = products.find(p => p.id === productId)
    if (!product) return
    const minPrice = Math.max(product.costPrice || 0, product.price * 0.5)
    const clamped = Math.max(minPrice, Math.min(newPrice, product.price))
    setCart((prev) => prev.map((item) =>
      item.productId === productId ? { ...item, price: clamped, wholesale: false } : item
    ))
  }

  // Coupon
  async function applyCoupon() {
    if (applyingCoupon) return
    const code = couponCode.trim()
    if (!code) { toast.error("Ingresa un código"); return }
    setApplyingCoupon(true)
    try {
      const res = await fetch(`/api/coupons/validate?code=${encodeURIComponent(code)}`)
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Cupón inválido") }
      const data = await res.json()
      setCouponId(data.id)
      if (data.type === "percentage") setCouponDiscount(Math.min(subtotal * (data.value / 100), subtotal))
      else setCouponDiscount(Math.min(data.value, subtotal))
      toast.success(`Cupón aplicado: ${data.code}`)
    } catch (e: any) { toast.error(e.message) }
    finally { setApplyingCoupon(false) }
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalBase = Math.max(0, subtotal - cartDiscount - couponDiscount)
  const total = Math.max(0, totalBase + (saleType === "shipping" ? shippingCost : 0))
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)
  const totalVes = total * bcvRate
  const subtotalVes = subtotal * bcvRate

  function toggleCat(id: string) {
    setCollapsedCats((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // Fetch agencies data
  useEffect(() => {
    fetch("/api/agencias").then(r => r.json()).then(data => {
      setAgenciaEmpresas(data.empresas || [])
      setAgenciaEstados(data.estados || [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedAgenciaEmpresa || !selectedAgenciaEstado) return
    setLoadingAgencias(true)
    fetch(`/api/agencias?empresa=${encodeURIComponent(selectedAgenciaEmpresa)}&estado=${encodeURIComponent(selectedAgenciaEstado)}`)
      .then(r => r.json()).then(data => setAgenciaOficinas(data.agencies || []))
      .catch(() => setAgenciaOficinas([]))
      .finally(() => setLoadingAgencias(false))
  }, [selectedAgenciaEmpresa, selectedAgenciaEstado])

  // Payment handlers
  function openPayment() {
    if (cart.length === 0) { toast.error("Agrega productos al carrito"); return }
    if (!customer) { toast.error("Selecciona un cliente"); return }
    setShowNewCustomer(false)
    setSplitPayments([{ method: "cash", amount: total }])
    setCashReceived("")
    setSelectedCreditTerm("")
    setCuotasCount(3)
    setDownPayment("")
    setPaymentOpen(true)
  }

  function addSplitPayment() {
    const used = splitPayments.reduce((s, p) => s + p.amount, 0)
    const remaining = Math.max(0, total - used)
    if (remaining <= 0) { toast.error("El total ya está cubierto"); return }
    setSplitPayments([...splitPayments, { method: "cash", amount: remaining }])
  }

  function updateSplitPayment(index: number, field: "method" | "amount", value: string) {
    setSplitPayments((prev) => prev.map((p, i) => i === index ? { ...p, [field]: field === "amount" ? parseFloat(value) || 0 : value } : p))
  }

  function removeSplitPayment(index: number) {
    setSplitPayments((prev) => prev.filter((_, i) => i !== index))
  }

  async function processSale() {
    if (submitting) return
    if (splitPayments.length === 0) { toast.error("Agrega al menos un método de pago"); return }
    if (!customer) { toast.error("Selecciona un cliente"); return }

    // Validate split payments cover total
    const totalPaid = splitPayments.reduce((s, p) => s + p.amount, 0)
    const isCredit = !!selectedCreditTerm
    if (!isCredit && Math.abs(totalPaid - total) > 0.01) {
      toast.error(`Los pagos suman $${totalPaid.toFixed(2)} pero el total es $${total.toFixed(2)}`)
      return
    }

    setSubmitting(true)
    try {
      const body: any = {
        source: "pos",
        customerName: customer.name,
        customerPhone: customer.phone,
        customerDocumentId: customer.documentId || null,
        customerEmail: customer.email || null,
        customerAddress: saleType === "shipping" ? customerAddress : (customer.address || null),
        customerCity: saleType === "shipping" ? customerCity : null,
        customerState: saleType === "shipping" ? customerState : null,
        shippingMethod: saleType === "shipping" ? shippingMethod : "pickup_store",
        shippingCost: saleType === "shipping" ? shippingCost : 0,
        shippingAgency: saleType === "shipping" ? shippingAgency : null,
        shippingAgencyAddress: saleType === "shipping" ? shippingAgencyAddress : null,
        shippingAddress: saleType === "shipping" ? shippingAddress : null,
        creditTerm: isCredit ? `cuotas_${cuotasCount}_15d` : null,
        downPayment: isCredit ? (parseFloat(downPayment) || 0) : 0,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          useWholesale: item.wholesale,
        })),
        payments: isCredit
          ? (parseFloat(downPayment) > 0
            ? [{ method: "cash", amount: parseFloat(downPayment), status: "verified" }]
            : [])
          : splitPayments.map((p) => ({
            method: p.method,
            amount: p.amount,
            status: p.method === "credit" ? "pending" : "verified",
          })),
        discount: cartDiscount + couponDiscount,
        couponId: couponId,
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Error al procesar venta") }
      const order = await res.json()
      setLastOrder(order)
      setPaymentOpen(false)
      setReceiptOpen(true)
      resetSaleState()
    } catch (e: any) { toast.error(e.message) }
    finally { setSubmitting(false) }
  }

  async function handlePOSMobileBarcode(code: string) {
    const cleanCode = code.trim().toLowerCase()
    const found = products.find(p => p.barcode?.toLowerCase() === cleanCode || p.sku?.toLowerCase() === cleanCode)
    if (found) {
      addToCart(found)
      toast.success(`Añadido: ${found.name}`)
    } else {
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(code)}&limit=1`)
        if (res.ok) {
          const resData = await res.json()
          const list = resData.data || []
          if (list.length > 0) {
            addToCart(list[0])
            setProducts(prev => prev.find(p => p.id === list[0].id) ? prev : [...prev, list[0]])
            toast.success(`Añadido: ${list[0].name}`)
            return
          }
        }
        toast.error(`Producto no encontrado para código: ${code}`)
      } catch {
        toast.error("Error al buscar producto")
      }
    }
  }

  // ─── Scanner functions ──────────────────────────────────────
  function handleScannerButton() {
    const isMobile = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent))
    if (isMobile) {
      setMobileScannerOpen(true)
    } else if (scannerSessionId && scannerStatus === "connected") {
      setScannerOpen(true)
    } else {
      startScanner()
    }
  }

  async function startScanner() {
    setScannerStatus("connecting")
    setScannerOpen(true)
    try {
      const res = await fetch("/api/scanner/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!res.ok) { setScannerStatus("error"); return }
      const data = await res.json()
      setScannerSessionId(data.sessionId)
      setScannerToken(data.token)
      setScannerStatus("idle")

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
      const qrUrl = `${baseUrl.replace(/\/$/, "")}/scanner/${data.sessionId}?token=${data.token}`
      setScannerQrUrl(qrUrl)

      const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY
      if (pusherKey) {
        try {
          const pusher = new Pusher(pusherKey, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "us2",
          })
          pusherRef.current = pusher
          const channel = pusher.subscribe(`scanner-${data.sessionId}`)

          channel.bind("phone_connected", (d: any) => {
            setScannerStatus("connected")
            setScannerDevice(d.deviceName || "Teléfono")
          })

          channel.bind("phone_disconnected", () => {
            setScannerStatus("idle")
            setScannerDevice("")
            cleanupScanner()
          })

          channel.bind("barcode_scanned", async (d: any) => {
            const code = d.barcode
            const found = products.find(p => p.barcode?.toLowerCase() === code.toLowerCase() ||
              p.sku?.toLowerCase() === code.toLowerCase())
            if (found) {
              addToCart(found)
            } else {
              try {
                const res = await fetch(`/api/products?q=${encodeURIComponent(code)}&limit=1`)
                const resData = await res.json()
                const list = resData.data || []
                if (list.length > 0) {
                  addToCart(list[0])
                  setProducts(prev => {
                    if (!prev.find(p => p.id === list[0].id)) return [...prev, list[0]]
                    return prev
                  })
                }
              } catch {}
            }
          })

          channel.bind("scanner_disconnect", () => {
            setScannerStatus("idle")
            setScannerDevice("")
            cleanupScanner()
          })
        } catch {
          console.warn("[scanner] Error al conectar con Pusher — escaneo funcionará sin eventos en tiempo real")
        }
      }
    } catch {
      setScannerStatus("error")
    }
  }

  function cleanupScanner() {
    if (pusherRef.current) {
      if (scannerSessionId) {
        const ch = pusherRef.current.channel(`scanner-${scannerSessionId}`)
        if (ch) { ch.unbind_all(); ch.unsubscribe() }
      }
      pusherRef.current.disconnect()
      pusherRef.current = null
    }
  }

  const lastProcessedPosEventIdRef = useRef<string | null>(null)

  // Hybrid Realtime Event Listener for POS
  useEffect(() => {
    if (!scannerSessionId) return

    let isCancelled = false
    lastProcessedPosEventIdRef.current = null

    const checkPosScannerEvents = async () => {
      try {
        const res = await fetch(`/api/scanner/session/${scannerSessionId}/events`)
        if (!res.ok || isCancelled) return
        const events = await res.json()
        if (Array.isArray(events) && events.length > 0) {
          const hasPhone = events.some((e: any) => e.type === "phone_connected")
          if (hasPhone) setScannerStatus("connected")

          const barcodeEvent = events.find((e: any) => e.type === "barcode_scanned")
          if (barcodeEvent && barcodeEvent.id !== lastProcessedPosEventIdRef.current) {
            lastProcessedPosEventIdRef.current = barcodeEvent.id
            try {
              const payload = typeof barcodeEvent.payload === "string"
                ? JSON.parse(barcodeEvent.payload)
                : barcodeEvent.payload
              if (payload?.barcode) {
                const code = payload.barcode
                const found = products.find(p => p.barcode?.toLowerCase() === code.toLowerCase() ||
                  p.sku?.toLowerCase() === code.toLowerCase())
                if (found) {
                  addToCart(found)
                } else {
                  try {
                    const searchRes = await fetch(`/api/products?q=${encodeURIComponent(code)}&limit=1`)
                    const searchData = await searchRes.json()
                    const list = searchData.data || []
                    if (list.length > 0) {
                      addToCart(list[0])
                      setProducts(prev => {
                        if (!prev.find(p => p.id === list[0].id)) return [...prev, list[0]]
                        return prev
                      })
                    }
                  } catch {}
                }
              }
            } catch (err) {
              console.error("[pos scanner] Error processing event:", err)
            }
          }
        }
      } catch (err) {
        console.warn("[pos scanner] Polling error:", err)
      }
    }

    checkPosScannerEvents()
    const intervalId = setInterval(checkPosScannerEvents, 1000)

    return () => {
      isCancelled = true
      clearInterval(intervalId)
    }
  }, [scannerSessionId, products])

  useEffect(() => {
    if (scannerQrUrl && qrCanvasRef.current) {
      QRCode.toCanvas(qrCanvasRef.current, scannerQrUrl, {
        width: 280,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      }).catch(console.error)
    }
  }, [scannerStatus, scannerQrUrl, scannerOpen])

  async function disconnectScanner() {
    if (scannerSessionId) {
      try {
        await fetch("/api/scanner/disconnect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: scannerSessionId, token: scannerToken }),
        })
      } catch {}
    }
    cleanupScanner()
    setScannerOpen(false)
    setScannerSessionId(null)
    setScannerToken(null)
    setScannerQrUrl(null)
    setScannerStatus("idle")
    setScannerDevice("")
  }

  function resetSaleState() {
    setCart([])
    setCartDiscount(0)
    setCouponDiscount(0)
    setCouponId(null)
    setCouponCode("")
    setCustomer(null)
    setCustomerSearch("")
    setCustomerResults([])
    setShowCustomerSearch(false)
    setShowNewCustomer(false)
    setNewCustomerName("")
    setNewCustomerPhone("")
    setNewCustomerDocumentId("")
    setSaleType("store")
    setSelectedCreditTerm("")
    setCuotasCount(3)
    setDownPayment("")
    setShippingMethod("pickup_agency")
    setShippingCost(0)
    setCustomerAddress("")
    setCustomerCity("")
    setCustomerState("")
    setShippingAgency("")
    setShippingAgencyAddress("")
    setShippingAddress("")
    setSplitPayments([])
    setCashReceived("")
  }

  function createCustomer() {
    if (!newCustomerName.trim()) { toast.error("Nombre obligatorio"); return }
    if (!newCustomerPhone.trim()) { toast.error("Teléfono obligatorio"); return }
    setCustomer({ name: newCustomerName.trim(), phone: newCustomerPhone.trim(), documentId: newCustomerDocumentId.trim() || undefined })
    setShowNewCustomer(false)
    setNewCustomerName("")
    setNewCustomerPhone("")
    setNewCustomerDocumentId("")
  }

  function handleNewSale() {
    setReceiptOpen(false)
    setLastOrder(null)
    resetSaleState()
  }

  function handlePrint() {
    window.print()
  }

  function handleDownloadPDF() {
    const printContent = document.getElementById("receipt-content")
    if (!printContent) return
    const win = window.open("", "_blank")
    if (!win) { toast.error("Permite ventanas emergentes"); return }
    win.document.write(`
      <html><head><title>Recibo</title>
      <style>
        body { font-family: monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 10px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; padding: 4px 2px; border-bottom: 1px dashed #ccc; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .total { font-size: 16px; font-weight: bold; }
        hr { border: none; border-top: 1px dashed #000; }
        @media print { body { width: 80mm; } }
      </style></head><body>
      ${printContent.innerHTML}
      <script>window.onload = function() { window.print(); window.close() }</script>
      </body></html>
    `)
    win.document.close()
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100dvh-4rem)] gap-0">
      {/* ─── LEFT: Products ─── */}
      <PosCatalog
        products={products}
        categories={categories}
        search={search}
        selectedCategory={selectedCategory}
        collapsedCats={collapsedCats}
        scannerStatus={scannerStatus}
        onSearchChange={handleSearchChange}
        onCategoryChange={setSelectedCategory}
        onToggleCat={toggleCat}
        onAddToCart={addToCart}
        onRefresh={() => { fetchProducts(); fetchTodaySales() }}
        onScannerButton={handleScannerButton}
        calcWholesalePrice={calcWholesalePrice}
      />

      {/* ─── RIGHT: Cart + Customer + Checkout ─── */}
      <div className="w-full lg:w-[380px] shrink-0 flex flex-col bg-background border-l border-border max-h-full lg:max-h-none">
        <PosTodaySales
          todaySales={todaySales}
          showTodaySales={showTodaySales}
          dailyLoading={dailyLoading}
          onToggleTodaySales={() => setShowTodaySales(!showTodaySales)}
          onLoadDailyReport={loadDailyReport}
        />

        <PosCart
          cart={cart}
          totalItems={totalItems}
          subtotal={subtotal}
          couponCode={couponCode}
          couponDiscount={couponDiscount}
          cartDiscount={cartDiscount}
          applyingCoupon={applyingCoupon}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeFromCart}
          onClearCart={() => setCart([])}
          onSetLinePrice={setLinePrice}
          onCouponCodeChange={setCouponCode}
          onApplyCoupon={applyCoupon}
          onCartDiscountChange={setCartDiscount}
        />

        {/* Customer */}
        <div className="px-4 py-2 border-t border-border shrink-0">
          <CustomerPicker
            customer={customer}
            customerSearch={customerSearch}
            customerResults={customerResults}
            showCustomerSearch={showCustomerSearch}
            showNewCustomer={showNewCustomer}
            newCustomerName={newCustomerName}
            newCustomerPhone={newCustomerPhone}
            newCustomerDocumentId={newCustomerDocumentId}
            onCustomerSearchChange={searchCustomer}
            onSelectCustomer={selectCustomer}
            onClearCustomer={() => setCustomer(null)}
            onStartNewCustomer={() => { setShowNewCustomer(true); setShowCustomerSearch(false) }}
            onCancelNewCustomer={() => setShowNewCustomer(false)}
            onNewCustomerNameChange={setNewCustomerName}
            onNewCustomerPhoneChange={setNewCustomerPhone}
            onNewCustomerDocumentIdChange={setNewCustomerDocumentId}
            onCreateCustomer={createCustomer}
            onShowCustomerSearch={() => setShowCustomerSearch(true)}
            onHideCustomerSearch={() => setTimeout(() => setShowCustomerSearch(false), 500)}
          />

          <ShippingFields
            customer={customer}
            saleType={saleType}
            shippingMethod={shippingMethod}
            shippingCost={shippingCost}
            customerAddress={customerAddress}
            customerCity={customerCity}
            customerState={customerState}
            shippingAgency={shippingAgency}
            shippingAgencyAddress={shippingAgencyAddress}
            shippingAddress={shippingAddress}
            agenciaEmpresas={agenciaEmpresas}
            agenciaEstados={agenciaEstados}
            agenciaOficinas={agenciaOficinas}
            selectedAgenciaEmpresa={selectedAgenciaEmpresa}
            selectedAgenciaEstado={selectedAgenciaEstado}
            loadingAgencias={loadingAgencias}
            onSaleTypeChange={setSaleType}
            onShippingMethodChange={setShippingMethod}
            onShippingCostChange={setShippingCost}
            onCustomerAddressChange={setCustomerAddress}
            onCustomerCityChange={setCustomerCity}
            onCustomerStateChange={setCustomerState}
            onShippingAddressChange={setShippingAddress}
            onAgencyCompanyChange={(empresa) => { setSelectedAgenciaEmpresa(empresa); setShippingAgency(empresa); setAgenciaOficinas([]) }}
            onAgencyStateChange={(estado) => { setSelectedAgenciaEstado(estado); setAgenciaOficinas([]) }}
            onSelectAgencyOffice={(agencia, direccion) => { setShippingAgency(agencia); setShippingAgencyAddress(direccion) }}
          />
        </div>

        {/* Total & Checkout */}
        <div className="border-t border-border p-4 space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Subtotal</span>
            <div className="text-right">
              <span className="text-sm font-semibold">${subtotal.toFixed(2)}</span>
              {showBolivares && bcvRate > 0 && <p className="text-[10px] text-muted-foreground/70">Bs. {subtotalVes.toFixed(2)}</p>}
            </div>
          </div>
          {(cartDiscount > 0 || couponDiscount > 0) && (
            <div className="flex items-center justify-between text-green-600">
              <span className="text-xs">Descuentos</span>
              <div className="text-right">
                <span className="text-xs font-semibold">-${(cartDiscount + couponDiscount).toFixed(2)}</span>
                {showBolivares && bcvRate > 0 && <p className="text-[10px] text-muted-foreground/70">-Bs. {((cartDiscount + couponDiscount) * bcvRate).toFixed(2)}</p>}
              </div>
            </div>
          )}
          {saleType === "shipping" && shippingCost > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Envío</span>
              <div className="text-right">
                <span className="text-xs font-semibold">${shippingCost.toFixed(2)}</span>
                {showBolivares && bcvRate > 0 && <p className="text-[10px] text-muted-foreground/70">Bs. {(shippingCost * bcvRate).toFixed(2)}</p>}
              </div>
            </div>
          )}
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-base font-bold">Total USD</span>
            <div className="text-right">
              <span className="text-xl font-black">${total.toFixed(2)}</span>
              {showBolivares && bcvRate > 0 && <p className="text-xs text-muted-foreground/70">Bs. {totalVes.toFixed(2)}</p>}
            </div>
          </div>

          <Button className="w-full gap-2 h-12 text-base font-bold" disabled={cart.length === 0 || !customer} onClick={openPayment}>
            <DollarSign className="size-5" />
            Cobrar ${total.toFixed(2)}
          </Button>
        </div>
      </div>

      {/* ─── PAYMENT MODAL ─── */}
      <PaymentModal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        total={total}
        splitPayments={splitPayments}
        cashReceived={cashReceived}
        selectedCreditTerm={selectedCreditTerm}
        cuotasCount={cuotasCount}
        downPayment={downPayment}
        submitting={submitting}
        onAddSplitPayment={addSplitPayment}
        onUpdateSplitPayment={updateSplitPayment}
        onRemoveSplitPayment={removeSplitPayment}
        onCashReceivedChange={setCashReceived}
        onCreditTermChange={setSelectedCreditTerm}
        onCuotasCountChange={setCuotasCount}
        onDownPaymentChange={setDownPayment}
        onProcess={processSale}
      />

      {/* ─── RECEIPT MODAL ─── */}
      <ReceiptModal
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        lastOrder={lastOrder}
        showBolivares={showBolivares}
        bcvRate={bcvRate}
        onPrint={handlePrint}
        onDownloadPDF={handleDownloadPDF}
        onNewSale={handleNewSale}
      />

      {/* Daily Report Dialog */}
      <DailyReportModal
        open={showDailyReport}
        onOpenChange={setShowDailyReport}
        loading={dailyLoading}
        summary={dailySummary}
        orders={dailyOrders}
      />

      {/* ─── Scanner Modal ─── */}
      <ScannerModal
        open={scannerOpen}
        onOpenChange={(open) => { if (!open) disconnectScanner() }}
        status={scannerStatus}
        device={scannerDevice}
        qrCanvasRef={qrCanvasRef}
        onRetry={startScanner}
        onDisconnect={disconnectScanner}
      />

      {/* Mobile Direct Scanner */}
      <MobileCameraScanner
        open={mobileScannerOpen}
        onClose={() => setMobileScannerOpen(false)}
        onSend={(code) => {
          handlePOSMobileBarcode(code)
        }}
        title="Escáner Punto de Venta"
        sendButtonLabel="Agregar al carrito"
      />
    </div>
  )
}
