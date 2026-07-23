"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { useBcvRate } from "@/lib/bcv-context"
import { formatBCV } from "@/lib/bcv/format"
import {
  Plus, Minus, Trash2, Search, Package, ShoppingCart, User, Phone, CreditCard,
  DollarSign, Printer, Download, X,   ChevronDown, ChevronUp, ChevronRight, Percent, Banknote,
  BadgePercent, ScanLine, Receipt, CalendarCheck, SplitSquareVertical, UserPlus,
} from "lucide-react"

interface Product {
  id: string; name: string; price: number; stock: number; images: string; sku?: string | null
  isWholesale: boolean; wholesalePrice?: number | null; wholesaleScales?: string | null
  costPrice?: number | null; hasSizes: boolean; sizes?: string | null
  categoryId: string | null; category: { id: string; name: string } | null
}

interface Category { id: string; name: string }
interface CartItem { productId: string; name: string; price: number; quantity: number; stock: number; wholesale?: boolean; originalPrice?: number }
interface CustomerInfo { name: string; phone: string; email?: string; address?: string; documentId?: string }
interface CustomerResult { id: string; name: string; phone: string; documentId?: string | null }
interface TodaySale { id: string; orderNumber: string; total: number; customerName: string; createdAt: string; paymentStatus: string }

export default function POSPage() {
  const router = useRouter()
  const { rate: bcvRate } = useBcvRate()

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
  const [splitPayments, setSplitPayments] = useState<Array<{ method: string; amount: number }>>([])
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
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Scan input ref
  const scanRef = useRef<HTMLInputElement>(null)
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
  const handleScanInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
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

  const filteredProducts = products.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || (p.sku?.toLowerCase() || "").includes(q)
  }).filter((p) => selectedCategory === "all" || p.categoryId === selectedCategory)

  const groupedProducts = categories
    .filter((c) => filteredProducts.some((p) => p.categoryId === c.id))
    .map((c) => ({ category: c, products: filteredProducts.filter((p) => p.categoryId === c.id) }))
  const uncategorized = filteredProducts.filter((p) => !p.categoryId)

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

  function getChangeAmount(): number {
    const cashIdx = splitPayments.findIndex(p => p.method === "cash")
    if (cashIdx === -1) return 0
    const cashAmount = splitPayments[cashIdx].amount
    const received = parseFloat(cashReceived) || 0
    return Math.max(0, received - cashAmount)
  }

  // For credit: calculate installment amounts
  function getCreditInstallments(): { downPaymentAmt: number; eachAmount: number; count: number } {
    const dp = parseFloat(downPayment) || 0
    const n = cuotasCount || 3
    const remaining = total - dp
    return { downPaymentAmt: dp, eachAmount: n > 0 ? remaining / n : 0, count: n }
  }

async function processSale() {
    if (submitting) return
    if (splitPayments.length === 0) { toast.error("Agrega al menos un mǸtodo de pago"); return }
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
      // Fast flow: don't clear yet, wait for receipt
    } catch (e: any) { toast.error(e.message) }
    finally { setSubmitting(false) }
  }

  function handleNewSale() {
    setReceiptOpen(false)
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
    setLastOrder(null)
    fetchTodaySales()
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
    <div className="flex h-[calc(100vh-4rem)] gap-0">
      {/* ─── LEFT: Products ─── */}
      <div className="flex flex-1 flex-col min-h-0 bg-card border-r border-border">
        {/* Search bar */}
        <div className="flex items-center gap-2 p-3 border-b border-border shrink-0">
          <div className="relative flex-1">
            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              ref={scanRef}
              placeholder="Buscar por nombre o SKU (escáner)..."
              value={search}
              onChange={handleScanInput}
              className="pl-9 text-sm"
              autoFocus
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-2 text-xs max-w-[140px]"
          >
            <option value="all">Todas</option>
            {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => { fetchProducts(); fetchTodaySales() }}>
            <Package className="size-3.5" /> Refrescar
          </Button>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {groupedProducts.map(({ category, products }) => (
            <div key={category.id}>
              <button onClick={() => toggleCat(category.id)} className="flex items-center gap-2 text-sm font-bold mb-2 hover:text-primary transition-colors w-full text-left">
                {collapsedCats.has(category.id) ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                {category.name} <span className="text-muted-foreground font-normal text-xs">({products.length})</span>
              </button>
              {!collapsedCats.has(category.id) && (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                  {products.map((p) => {
                    const { price: wholesalePrice, wholesale } = calcWholesalePrice(p, 2)
                    return (
                      <Card key={p.id} className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-sm active:scale-[0.98]" onClick={() => addToCart(p)}>
                        <CardContent className="p-2">
                          <div className="aspect-square rounded-md bg-muted flex items-center justify-center mb-1.5 overflow-hidden relative">
                            {p.images ? (
                              <img src={JSON.parse(p.images)[0]} alt={p.name} className="size-full object-cover" />
                            ) : (
                              <Package className="size-6 text-muted-foreground" />
                            )}
                            {wholesale && (
                              <span className="absolute top-1 right-1 bg-amber-500 text-white text-[8px] font-bold px-1 py-0.5 rounded">$ MAYOR</span>
                            )}
                            {p.stock <= 0 && (
                              <span className="absolute bottom-1 left-1 bg-red-500 text-white text-[8px] font-bold px-1 py-0.5 rounded">AGOTADO</span>
                            )}
                          </div>
                          <p className="text-xs font-semibold truncate leading-tight">{p.name}</p>
                          {p.sku && <p className="text-[9px] text-muted-foreground truncate">SKU: {p.sku}</p>}
                          <div className="flex items-center justify-between mt-1">
                            <p className={`text-xs font-bold ${wholesale ? "text-amber-600" : ""}`}>
                              {wholesale ? `$${wholesalePrice.toFixed(2)}` : `$${p.price.toFixed(2)}`}
                            </p>
                            <p className="text-[9px] text-muted-foreground">{p.stock} uds</p>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
          {uncategorized.length > 0 && (
            <div>
              <button onClick={() => toggleCat("__uncat")} className="flex items-center gap-2 text-sm font-bold mb-2 hover:text-primary transition-colors w-full text-left">
                {collapsedCats.has("__uncat") ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                Sin categoría <span className="text-muted-foreground font-normal text-xs">({uncategorized.length})</span>
              </button>
              {!collapsedCats.has("__uncat") && (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                  {uncategorized.map((p) => (
                    <Card key={p.id} className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-sm active:scale-[0.98]" onClick={() => addToCart(p)}>
                      <CardContent className="p-2">
                        <div className="aspect-square rounded-md bg-muted flex items-center justify-center mb-1.5 overflow-hidden relative">
                          {p.images ? (
                            <img src={JSON.parse(p.images)[0]} alt={p.name} className="size-full object-cover" />
                          ) : (
                            <Package className="size-6 text-muted-foreground" />
                          )}
                          {p.stock <= 0 && (
                            <span className="absolute bottom-1 left-1 bg-red-500 text-white text-[8px] font-bold px-1 py-0.5 rounded">AGOTADO</span>
                          )}
                        </div>
                        <p className="text-xs font-semibold truncate leading-tight">{p.name}</p>
                        {p.sku && <p className="text-[9px] text-muted-foreground truncate">SKU: {p.sku}</p>}
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs font-bold">${p.price.toFixed(2)}</p>
                          <p className="text-[9px] text-muted-foreground">{p.stock} uds</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Package className="size-12 mb-3" />
              <p className="text-sm">No se encontraron productos</p>
              <p className="text-xs mt-1">Escanea un código SKU o busca por nombre</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── RIGHT: Cart + Customer + Checkout ─── */}
      <div className="w-[380px] shrink-0 flex flex-col bg-background border-l border-border">
        {/* Today's sales summary (collapsible) */}
        <button onClick={() => setShowTodaySales(!showTodaySales)} className="flex items-center justify-between px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground border-b border-border shrink-0">
          <span className="flex items-center gap-1.5"><Receipt className="size-3.5" /> Ventas hoy</span>
          <span className="flex items-center gap-3">
            <span>{todaySales.length} ventas</span>
            <span>${todaySales.reduce((s, o) => s + o.total, 0).toFixed(2)}</span>
            {showTodaySales ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </span>
        </button>
        {showTodaySales && (
          <div className="max-h-32 overflow-y-auto border-b border-border bg-muted/20 text-xs px-4 py-2 space-y-1 shrink-0">
            {todaySales.length === 0 ? (
              <p className="text-muted-foreground text-center py-2">Sin ventas hoy</p>
            ) : (
              todaySales.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-1">
                  <span className="font-medium">{s.orderNumber}</span>
                  <span className="truncate flex-1 mx-2 text-muted-foreground">{s.customerName}</span>
                  <span className="font-bold">${s.total.toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Daily report button */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0 bg-sky-50 dark:bg-sky-950/20">
          <div className="flex items-center gap-2 text-xs">
            <CalendarCheck className="size-4 text-sky-600" />
            <span className="font-semibold">Reporte del día</span>
            <span className="text-muted-foreground">{todaySales.length} ventas</span>
            <span className="text-muted-foreground">· ${todaySales.reduce((s, o) => s + o.total, 0).toFixed(2)}</span>
          </div>
          <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={loadDailyReport}>
            {dailyLoading ? "..." : "Ver detalle"}
          </Button>
        </div>

        {/* Cart header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h2 className="font-bold flex items-center gap-1.5 text-sm">
            <ShoppingCart className="size-4" /> Carrito
          </h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{totalItems} ítem(s)</span>
            {cart.length > 0 && (
              <Button variant="ghost" size="icon" className="size-6 text-red-500" onClick={() => setCart([])}>
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <StoreIcon />
              <p className="text-sm mt-3">Carrito vacío</p>
              <p className="text-xs mt-1">Selecciona productos de la izquierda</p>
            </div>
          ) : (
            cart.map((item) => {
              const lineTotal = item.price * item.quantity
              return (
                <div key={item.productId} className="flex items-start gap-2 rounded-lg border border-border p-2 bg-card">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{item.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {item.wholesale ? (
                        <span className="text-[10px] text-amber-600 font-bold">$ MAYOR</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">${item.price.toFixed(2)} c/u</span>
                      )}
                    </div>
                    {/* Line price edit */}
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[9px] text-muted-foreground">Precio:</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => setLinePrice(item.productId, parseFloat(e.target.value) || 0)}
                        className="h-6 w-20 text-xs px-1 py-0"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="outline" size="icon" className="size-6" onClick={() => updateQuantity(item.productId, -1)}>
                      <Minus className="size-3" />
                    </Button>
                    <span className="text-sm font-bold w-7 text-center">{item.quantity}</span>
                    <Button variant="outline" size="icon" className="size-6" onClick={() => updateQuantity(item.productId, 1)}>
                      <Plus className="size-3" />
                    </Button>
                  </div>
                  <div className="text-right shrink-0 w-16">
                    <p className="text-xs font-bold">${lineTotal.toFixed(2)}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="size-6 text-red-400 shrink-0" onClick={() => removeFromCart(item.productId)}>
                    <X className="size-3" />
                  </Button>
                </div>
              )
            })
          )}
        </div>

        {/* Coupon */}
        {cart.length > 0 && (
          <div className="px-4 py-2 border-t border-border shrink-0">
            <div className="flex items-center gap-2">
              <BadgePercent className="size-3.5 text-muted-foreground" />
              <Input
                placeholder="Código cupón"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="h-8 text-xs flex-1"
                onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
              />
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={applyCoupon} disabled={applyingCoupon}>
                {applyingCoupon ? "..." : "Aplicar"}
              </Button>
            </div>
            {couponDiscount > 0 && (
              <p className="text-[10px] text-green-600 mt-1">Descuento: -${couponDiscount.toFixed(2)}</p>
            )}
          </div>
        )}

        {/* Cart discount */}
        {cart.length > 0 && (
          <div className="px-4 py-1 shrink-0 flex items-center gap-2">
            <Percent className="size-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Descuento global:</span>
            <Input
              type="number"
              min={0}
              max={subtotal}
              value={cartDiscount}
              onChange={(e) => setCartDiscount(Math.max(0, Math.min(subtotal, parseFloat(e.target.value) || 0)))}
              className="h-7 w-20 text-xs px-1"
            />
          </div>
        )}

        {/* Customer */}
        <div className="px-4 py-2 border-t border-border shrink-0">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Cliente</Label>
          {customer ? (
            <div className="flex items-center justify-between rounded-lg bg-muted/40 p-2">
              <div>
                <p className="text-xs font-semibold">{customer.name}</p>
                <p className="text-[10px] text-muted-foreground">{customer.phone}{customer.documentId ? ` · CI: ${customer.documentId}` : ""}</p>
              </div>
              <Button variant="ghost" size="icon" className="size-6" onClick={() => setCustomer(null)}>
                <X className="size-3" />
              </Button>
            </div>
          ) : (
            <div>
              {/* Search + New customer button */}
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Input
                    placeholder="Buscar por nombre, teléfono o cédula..."
                    value={showCustomerSearch ? customerSearch : ""}
                    onChange={(e) => { setShowCustomerSearch(true); searchCustomer(e.target.value) }}
                    onFocus={() => setShowCustomerSearch(true)}
                    onBlur={() => setTimeout(() => setShowCustomerSearch(false), 500)}
                    className="h-8 text-xs"
                  />
                  {showCustomerSearch && customerResults.length > 0 && (
                    <div className="absolute bottom-full mb-1 left-0 right-0 bg-background border border-border rounded-lg shadow-lg z-10 max-h-28 overflow-y-auto">
                      {customerResults.map((c) => (
                        <button key={c.id} type="button" className="w-full px-3 py-2 text-left text-xs hover:bg-muted flex items-center gap-2"
                          onMouseDown={() => selectCustomer(c)}>
                          <User className="size-3 text-muted-foreground shrink-0" />
                          <span className="font-medium truncate">{c.name}</span>
                          {c.documentId && <span className="text-[10px] text-muted-foreground shrink-0">CI: {c.documentId}</span>}
                          <span className="text-muted-foreground ml-auto shrink-0">{c.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs shrink-0" onClick={() => { setShowNewCustomer(true); setShowCustomerSearch(false) }}>
                  <UserPlus className="size-3.5" /> Nuevo
                </Button>
              </div>

              {/* Customer found via search — quick-create fallback */}
              {showCustomerSearch && customerSearch.length >= 2 && customerResults.length === 0 && (
                <div className="mt-1 rounded-lg border border-dashed border-border p-2">
                  <p className="text-[10px] text-muted-foreground mb-1.5">Cliente no encontrado</p>
                  <div className="flex gap-1.5">
                    <Input placeholder="Nombre" value={customerSearch} onChange={(e) => {}} className="h-7 text-[11px] flex-1" />
                    <Button size="sm" variant="outline" className="h-7 text-[10px] shrink-0"
                      onMouseDown={() => { setShowNewCustomer(true); setShowCustomerSearch(false) }}>
                      Crear
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Inline create customer form */}
          {showNewCustomer && !customer && (
            <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 p-2 space-y-1.5">
              <p className="text-[10px] font-bold text-primary">Nuevo cliente</p>
              <Input placeholder="Nombre *" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} className="h-7 text-[11px]" autoFocus />
              <Input placeholder="Teléfono *" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} className="h-7 text-[11px]" />
              <Input placeholder="Cédula / RIF" value={newCustomerDocumentId} onChange={(e) => setNewCustomerDocumentId(e.target.value)} className="h-7 text-[11px]" />
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="h-7 text-[10px] flex-1" onClick={() => setShowNewCustomer(false)}>Cancelar</Button>
                <Button size="sm" className="h-7 text-[10px] flex-1" onClick={() => {
                  if (!newCustomerName.trim()) { toast.error("Nombre obligatorio"); return }
                  if (!newCustomerPhone.trim()) { toast.error("Teléfono obligatorio"); return }
                  setCustomer({ name: newCustomerName.trim(), phone: newCustomerPhone.trim(), documentId: newCustomerDocumentId.trim() || undefined })
                  setShowNewCustomer(false)
                  setNewCustomerName("")
                  setNewCustomerPhone("")
                  setNewCustomerDocumentId("")
                }}>Agregar cliente</Button>
              </div>
            </div>
          )}

          {/* Tipo de venta */}
          {customer && (
            <div className="flex items-center gap-1.5 mt-2">
              <button onClick={() => setSaleType("store")} className={`flex-1 h-7 text-[11px] font-bold rounded border transition-colors ${saleType === "store" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/50"}`}>En tienda</button>
              <button onClick={() => setSaleType("shipping")} className={`flex-1 h-7 text-[11px] font-bold rounded border transition-colors ${saleType === "shipping" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/50"}`}>Con envío</button>
            </div>
          )}

          {/* Campos de envío */}
          {customer && saleType === "shipping" && (
            <div className="mt-2 space-y-1.5">
              <Input placeholder="Dirección del cliente" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className="h-7 text-[11px]" />
              <div className="flex gap-1.5">
                <Input placeholder="Ciudad" value={customerCity} onChange={(e) => setCustomerCity(e.target.value)} className="h-7 text-[11px] flex-1" />
                <Input placeholder="Estado" value={customerState} onChange={(e) => setCustomerState(e.target.value)} className="h-7 text-[11px] flex-1" />
              </div>
              <select value={shippingMethod} onChange={(e) => setShippingMethod(e.target.value)} className="w-full h-7 text-[11px] rounded border border-border bg-background px-2">
                <option value="pickup_agency">Retiro en agencia</option>
                <option value="delivery">Delivery</option>
              </select>
              {shippingMethod === "pickup_agency" && (
                <>
                  <div className="flex gap-1.5">
                    <select value={selectedAgenciaEmpresa} onChange={(e) => { setSelectedAgenciaEmpresa(e.target.value); setShippingAgency(e.target.value); setAgenciaOficinas([]) }} className="flex-1 h-7 text-[11px] rounded border border-border bg-background px-1">
                      <option value="">Courier</option>
                      {agenciaEmpresas.map((emp) => <option key={emp} value={emp}>{emp}</option>)}
                    </select>
                    <select value={selectedAgenciaEstado} onChange={(e) => { setSelectedAgenciaEstado(e.target.value); setAgenciaOficinas([]) }} className="flex-1 h-7 text-[11px] rounded border border-border bg-background px-1">
                      <option value="">Estado</option>
                      {agenciaEstados.map((est) => <option key={est} value={est}>{est}</option>)}
                    </select>
                  </div>
                  {loadingAgencias && <p className="text-[10px] text-muted-foreground">Cargando oficinas...</p>}
                  {agenciaOficinas.length > 0 && (
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {agenciaOficinas.map((oficina) => (
                        <button key={oficina.id} onClick={() => { setShippingAgency(oficina.agencia); setShippingAgencyAddress(oficina.direccion || "") }}
                          className={`w-full text-left p-1.5 rounded border text-[11px] transition-colors ${shippingAgency === oficina.agencia && shippingAgencyAddress === (oficina.direccion || "") ? "bg-primary/10 border-primary" : "border-border hover:bg-muted/50"}`}>
                          <span className="font-semibold">{oficina.agencia}</span>
                          {oficina.ciudad && <span className="text-muted-foreground"> — {oficina.ciudad}</span>}
                          {oficina.direccion && <p className="text-[10px] text-muted-foreground truncate">{oficina.direccion}</p>}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              {shippingMethod === "delivery" && (
                <Input placeholder="Dirección de entrega" value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} className="h-7 text-[11px]" />
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">Costo envío USD:</span>
                <Input type="number" min={0} step="0.01" value={shippingCost} onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)} className="h-7 text-[11px] w-24" />
              </div>
            </div>
          )}
        </div>

        {/* Total & Checkout */}
        <div className="border-t border-border p-4 space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Subtotal</span>
            <span className="text-sm font-semibold">${subtotal.toFixed(2)}</span>
          </div>
          {(cartDiscount > 0 || couponDiscount > 0) && (
            <div className="flex items-center justify-between text-green-600">
              <span className="text-xs">Descuentos</span>
              <span className="text-xs font-semibold">-${(cartDiscount + couponDiscount).toFixed(2)}</span>
            </div>
          )}
          {saleType === "shipping" && shippingCost > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Envío</span>
              <span className="text-xs font-semibold">${shippingCost.toFixed(2)}</span>
            </div>
          )}
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-base font-bold">Total USD</span>
            <span className="text-xl font-black">${total.toFixed(2)}</span>
          </div>

          <Button className="w-full gap-2 h-12 text-base font-bold" disabled={cart.length === 0 || !customer} onClick={openPayment}>
            <DollarSign className="size-5" />
            Cobrar ${total.toFixed(2)}
          </Button>
        </div>
      </div>

      {/* ─── PAYMENT MODAL ─── */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="size-5" /> Cobrar
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Credit option */}
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
              <Label className="flex items-center gap-2 text-sm font-bold mb-2">
                <CalendarCheck className="size-4 text-amber-600" /> Vender a crédito
              </Label>
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setSelectedCreditTerm("")} className={`flex-1 h-8 text-xs font-bold rounded border transition-colors ${!selectedCreditTerm ? "bg-amber-500 text-white border-amber-500" : "bg-background text-muted-foreground border-border"}`}>Pago de contado</button>
                <button onClick={() => setSelectedCreditTerm("cuotas")} className={`flex-1 h-8 text-xs font-bold rounded border transition-colors ${selectedCreditTerm ? "bg-amber-500 text-white border-amber-500" : "bg-background text-muted-foreground border-border"}`}>A crédito</button>
              </div>
              {selectedCreditTerm && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs w-28">Cantidad cuotas:</Label>
                    <Button variant="outline" size="icon" className="size-7" onClick={() => setCuotasCount(Math.max(2, cuotasCount - 1))} disabled={cuotasCount <= 2}>
                      <Minus className="size-3" />
                    </Button>
                    <span className="text-sm font-bold w-6 text-center">{cuotasCount}</span>
                    <Button variant="outline" size="icon" className="size-7" onClick={() => setCuotasCount(Math.min(12, cuotasCount + 1))} disabled={cuotasCount >= 12}>
                      <Plus className="size-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs w-28">Inicial (opcional):</Label>
                    <Input
                      type="number" min={0} max={total}
                      value={downPayment}
                      onChange={(e) => setDownPayment(e.target.value)}
                      className="h-8 text-sm flex-1"
                      placeholder="0.00"
                    />
                  </div>
                  {(() => {
                    const { downPaymentAmt, eachAmount, count } = getCreditInstallments()
                    const dates = Array.from({ length: count }, (_, i) => {
                      const dt = new Date(); dt.setDate(dt.getDate() + (i + 1) * 15)
                      return dt.toLocaleDateString()
                    })
                    return (
                      <div className="text-xs space-y-1 text-muted-foreground bg-amber-100/50 dark:bg-amber-950/20 rounded p-2">
                        {downPaymentAmt > 0 && <p>Inicial: <span className="font-bold text-foreground">${downPaymentAmt.toFixed(2)}</span></p>}
                        <p>{count} cuotas de: <span className="font-bold text-foreground">${eachAmount.toFixed(2)}</span></p>
                        <p className="text-[10px]">Vencen: {dates.join(", ")}</p>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>

            {/* Split payments */}
            <div>
              <Label className="flex items-center gap-1.5 text-sm font-bold mb-2">
                <SplitSquareVertical className="size-4" /> Métodos de pago
              </Label>
              <div className="space-y-2">
                {splitPayments.map((sp, i) => (
                  <div key={i} className="flex items-center gap-2">
                      <select
                      value={sp.method}
                      onChange={(e) => updateSplitPayment(i, "method", e.target.value)}
                      className="h-9 rounded-lg border border-border bg-background px-2 text-sm w-32"
                    >
                      <option value="cash">Efectivo</option>
                      <option value="bank_transfer">Transferencia</option>
                      <option value="pago_movil">Pago Móvil</option>
                      <option value="binancepay">Binance Pay</option>
                    </select>
                    <div className="relative flex-1">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                      <Input
                        type="number" min={0} step="0.01"
                        value={sp.amount}
                        onChange={(e) => updateSplitPayment(i, "amount", e.target.value)}
                        className="h-9 pl-6 text-sm"
                      />
                    </div>
                    {splitPayments.length > 1 && (
                      <Button variant="ghost" size="icon" className="size-8 text-red-500" onClick={() => removeSplitPayment(i)}>
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {!selectedCreditTerm && (
                  <Button variant="outline" size="sm" className="text-xs gap-1" onClick={addSplitPayment}>
                    <Plus className="size-3" /> Agregar método de pago
                  </Button>
                )}
              </div>
            </div>

            {/* Cash received / change (only for cash payments) */}
            {splitPayments.some(p => p.method === "cash") && !selectedCreditTerm && (
              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs w-28">Recibido en efectivo:</Label>
                  <Input
                    type="number" min={0} step="0.01"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="h-9 text-sm flex-1"
                    placeholder="0.00"
                  />
                </div>
                {parseFloat(cashReceived) > 0 && (
                  <div className="flex items-center justify-between text-green-600">
                    <span className="text-sm font-bold">Cambio:</span>
                    <span className="text-lg font-black">${getChangeAmount().toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Summary */}
            <div className="rounded-lg bg-muted/30 p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Total</span>
                <span className="font-bold">${total.toFixed(2)}</span>
              </div>
              {!selectedCreditTerm && (
                <div className="flex justify-between text-muted-foreground">
                  <span>A pagar ahora</span>
                  <span className="font-bold text-foreground">
                    ${splitPayments.reduce((s, p) => s + p.amount, 0).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancelar</Button>
            <Button onClick={processSale} disabled={submitting} className="gap-2 min-w-[200px]">
              <CreditCard className="size-4" />
              {submitting ? "Procesando..." : selectedCreditTerm ? "Crear crédito" : `Cobrar $${splitPayments.reduce((s, p) => s + p.amount, 0).toFixed(2)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── RECEIPT MODAL ─── */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="size-5" /> Venta completada
            </DialogTitle>
          </DialogHeader>

          <div id="receipt-content" className="font-mono text-xs leading-relaxed">
            {lastOrder && (
              <div className="space-y-2">
                <div className="text-center border-b border-dashed pb-2">
                  <p className="text-sm font-bold">{lastOrder.store?.name || "Panitas"}</p>
                  <p className="text-[10px] text-muted-foreground">RIF: {lastOrder.store?.rif || "N/A"}</p>
                </div>

                <div className="text-center">
                  <p className="font-bold text-sm">RECIBO DE VENTA</p>
                  <p className="text-muted-foreground">#{lastOrder.orderNumber}</p>
                  <p className="text-muted-foreground">{new Date(lastOrder.createdAt).toLocaleString("es-VE")}</p>
                </div>

                <hr className="border-dashed" />

                <div className="space-y-1">
                  <p><span className="text-muted-foreground">Cliente:</span> {lastOrder.customerName}</p>
                  <p><span className="text-muted-foreground">Teléfono:</span> {lastOrder.customerPhone}</p>
                </div>

                <hr className="border-dashed" />

                {(lastOrder.items || []).map((item: any, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span className="flex-1">{item.productName || item.product?.name} x{item.quantity}</span>
                    <span className="font-bold">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}

                {lastOrder.customerAddress && (
                  <div className="text-muted-foreground text-[10px] mt-1">
                    <p><span className="font-semibold">Dirección:</span> {lastOrder.customerAddress}{lastOrder.customerCity ? `, ${lastOrder.customerCity}` : ""}{lastOrder.customerState ? `, ${lastOrder.customerState}` : ""}</p>
                    {lastOrder.shippingMethod === "pickup_agency" && <p><span className="font-semibold">Agencia:</span> {lastOrder.shippingAgency || "N/A"} — {lastOrder.shippingAgencyAddress || ""}</p>}
                    {lastOrder.shippingMethod === "delivery" && lastOrder.shippingAddress && <p><span className="font-semibold">Delivery:</span> {lastOrder.shippingAddress}</p>}
                  </div>
                )}

                <hr className="border-dashed" />

                <div className="space-y-0.5">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${lastOrder.subtotal?.toFixed(2)}</span>
                  </div>
                  {lastOrder.shippingCost > 0 && (
                    <div className="flex justify-between">
                      <span>Envío</span>
                      <span>${lastOrder.shippingCost.toFixed(2)}</span>
                    </div>
                  )}
                  {lastOrder.discount > 0 && (
                    <div className="flex justify-between text-red-500">
                      <span>Descuento</span>
                      <span>-${lastOrder.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black">
                    <span>TOTAL</span>
                    <span>${lastOrder.total?.toFixed(2)}</span>
                  </div>
                </div>

                <hr className="border-dashed" />

                <div className="text-center text-muted-foreground space-y-0.5">
                  <p>Método(s) de pago:</p>
                  {(lastOrder.payments || []).map((p: any, i: number) => (
                    <p key={i}>{p.method === "cash" ? "Efectivo" : p.method === "bank_transfer" ? "Transferencia" : p.method === "pago_movil" ? "Pago Móvil" : p.method === "binancepay" ? "Binance Pay" : p.method} ${p.amount.toFixed(2)}</p>
                  ))}
                  {lastOrder.creditTerm?.startsWith("cuotas_") && (() => {
                    const n = parseInt(lastOrder.creditTerm.split("_")[1]) || 3
                    return <p className="text-amber-600 font-bold mt-1">Pago a crédito: {n} cuotas c/15 días</p>
                  })()}
                </div>

                <hr className="border-dashed" />

                <div className="text-center text-[10px] text-muted-foreground pt-1">
                  <p>¡Gracias por tu compra!</p>
                  {bcvRate > 0 && <p>Tasa BCV: Bs. {formatBCV(bcvRate)} / USD</p>}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" className="gap-1.5 text-xs flex-1" onClick={handlePrint}>
              <Printer className="size-4" /> Imprimir
            </Button>
            <Button variant="outline" className="gap-1.5 text-xs flex-1" onClick={handleDownloadPDF}>
              <Download className="size-4" /> PDF
            </Button>
            <Button className="gap-1.5 text-xs flex-1" onClick={handleNewSale}>
              <Plus className="size-4" /> Nueva venta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Daily Report Dialog */}
      <Dialog open={showDailyReport} onOpenChange={(o) => { if (!o) setShowDailyReport(false) }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="size-5 text-sky-600" /> Reporte del día
            </DialogTitle>
          </DialogHeader>
          {dailyLoading ? (
            <div className="flex justify-center py-12"><div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : dailySummary ? (
            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-4">
                <Card><CardContent className="p-2 text-center"><p className="text-[9px] text-muted-foreground uppercase">Ventas</p><p className="text-base font-bold">${dailySummary.totalRevenue.toFixed(2)}</p></CardContent></Card>
                <Card><CardContent className="p-2 text-center"><p className="text-[9px] text-muted-foreground uppercase">Órdenes</p><p className="text-base font-bold">{dailySummary.totalOrders}</p></CardContent></Card>
                <Card><CardContent className="p-2 text-center"><p className="text-[9px] text-muted-foreground uppercase">Tienda</p><p className="text-base font-bold">{dailySummary.storeSales}</p></CardContent></Card>
                <Card><CardContent className="p-2 text-center"><p className="text-[9px] text-muted-foreground uppercase">POS</p><p className="text-base font-bold">{dailySummary.posSales}</p></CardContent></Card>
              </div>

              {dailySummary.creditSales > 0 && (
                <p className="text-xs text-amber-600 font-semibold">Ventas a crédito: {dailySummary.creditSales}</p>
              )}

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {dailyOrders.map((o: any) => {
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
    </div>
  )
}

function StoreIcon() {
  return (
    <svg className="size-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
    </svg>
  )
}
