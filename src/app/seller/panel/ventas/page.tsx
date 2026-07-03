"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Plus, Minus, Trash2, Search, Package, ShoppingCart, Store, CreditCard, UserPlus, User, Check, ChevronDown, ChevronRight } from "lucide-react"

interface Product {
  id: string; name: string; price: number; stock: number; images: string
  categoryId: string | null; category: { id: string; name: string } | null
}
interface Category { id: string; name: string }
interface CustomerInfo {
  name: string; phone: string; documentId?: string; address?: string
}

export default function SellerNuevaVentaPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [cart, setCart] = useState<Array<{ productId: string; name: string; price: number; quantity: number; stock: number }>>([])
  const [search, setSearch] = useState("")
  const [creditDays, setCreditDays] = useState("")
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set())
  const [creditOptions, setCreditOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Customer
  const [customer, setCustomer] = useState<CustomerInfo | null>(null)
  const [customerSearch, setCustomerSearch] = useState("")
  const [customerResults, setCustomerResults] = useState<Array<{ id: string; name: string; phone: string; documentId: string | null }>>([])
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)

  // Create customer modal
  const [createOpen, setCreateOpen] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", documentId: "", address: "" })

  useEffect(() => {
    fetchProducts(); loadStoreConfig()
  }, [])

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

  async function loadStoreConfig() {
    try {
      const res = await fetch("/api/stores")
      if (res.ok) {
        const store = await res.json()
        const days = store.creditDays || "5,10,15,30"
        const opts = days.split(",").map((d: string) => d.trim()).filter(Boolean)
        setCreditOptions(opts)
        if (opts.length > 0) setCreditDays(opts[0])
      }
    } catch {}
  }

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) { toast.error("Stock insuficiente"); return prev }
        return prev.map((item) => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1, stock: product.stock }]
    })
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item
        const newQty = item.quantity + delta
        if (newQty <= 0) return null
        if (newQty > item.stock) { toast.error("Stock insuficiente"); return item }
        return { ...item, quantity: newQty }
      }).filter(Boolean) as typeof cart
    )
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((item) => item.productId !== productId))
  }

  async function searchCustomer(q: string) {
    setCustomerSearch(q)
    if (q.length < 2) { setCustomerResults([]); return }
    try {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setCustomerResults(data.data || [])
      }
    } catch {}
  }

  function selectCustomer(c: { id: string; name: string; phone: string; documentId: string | null }) {
    setCustomer({ name: c.name, phone: c.phone, documentId: c.documentId || undefined })
    setCustomerSearch("")
    setCustomerResults([])
    setShowCustomerSearch(false)
  }

  function openCreateCustomer() {
    setNewCustomer({ name: "", phone: "", documentId: "", address: "" })
    setCreateOpen(true)
  }

  function confirmCreateCustomer() {
    if (!newCustomer.name.trim() || !newCustomer.phone.trim()) {
      return toast.error("Nombre y teléfono requeridos")
    }
    setCustomer({
      name: newCustomer.name.trim(),
      phone: newCustomer.phone.trim(),
      documentId: newCustomer.documentId.trim() || undefined,
      address: newCustomer.address.trim() || undefined,
    })
    setCreateOpen(false)
    setCustomerSearch("")
    setCustomerResults([])
    setShowCustomerSearch(false)
    toast.success("Cliente seleccionado")
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const groupedProducts = categories
    .filter((c) => filteredProducts.some((p) => p.categoryId === c.id))
    .map((c) => ({ category: c, products: filteredProducts.filter((p) => p.categoryId === c.id) }))
  const uncategorized = filteredProducts.filter((p) => !p.categoryId)

  async function processSale() {
    if (cart.length === 0) { toast.error("Agrega productos al carrito"); return }
    if (!customer) { toast.error("Selecciona o crea un cliente"); return }
    setLoading(true)
    try {
      const res = await fetch("/api/seller/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customer.name,
          customerPhone: customer.phone,
          customerAddress: customer.address || null,
          items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
          shippingMethod: "pickup_store",
          payment: { method: "credit", amount: subtotal, status: "pending" },
          creditDays: parseInt(creditDays) || 0,
        }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Error") }
      const order = await res.json()
      toast.success(`Venta #${order.orderNumber} creada`)
      setCart([]); setCustomer(null)
      router.refresh()
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] gap-4">
      {/* Products */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="mb-4 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Buscar productos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {groupedProducts.map(({ category, products }) => {
            const isCollapsed = collapsedCats.has(category.id)
            return (
              <div key={category.id} className="rounded-xl border border-border overflow-hidden">
                <button type="button" onClick={() => setCollapsedCats((prev) => { const next = new Set(prev); if (next.has(category.id)) next.delete(category.id); else next.add(category.id); return next })}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                  {isCollapsed ? <ChevronRight className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                  <span className="text-sm font-semibold">{category.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{products.length}</span>
                </button>
                {!isCollapsed && (
                  <div className="divide-y divide-border">
                    {products.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/20 transition-colors">
                        <div className="size-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {p.images ? <img src={JSON.parse(p.images)[0]} alt={p.name} className="size-full object-cover" /> : <Package className="size-5 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">${p.price.toFixed(2)} &middot; Stock: {p.stock}</p>
                        </div>
                        <Button variant="outline" size="icon" className="size-8 shrink-0" onClick={() => addToCart(p)}
                          disabled={p.stock <= 0} title={p.stock <= 0 ? "Sin stock" : "Agregar"}>
                          <Plus className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {uncategorized.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <button type="button" onClick={() => setCollapsedCats((prev) => { const next = new Set(prev); if (next.has("__uncategorized")) next.delete("__uncategorized"); else next.add("__uncategorized"); return next })}
                className="w-full flex items-center gap-2 px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                {collapsedCats.has("__uncategorized") ? <ChevronRight className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                <span className="text-sm font-semibold">Sin categoría</span>
                <span className="ml-auto text-xs text-muted-foreground">{uncategorized.length}</span>
              </button>
              {!collapsedCats.has("__uncategorized") && (
                <div className="divide-y divide-border">
                  {uncategorized.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/20 transition-colors">
                      <div className="size-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {p.images ? <img src={JSON.parse(p.images)[0]} alt={p.name} className="size-full object-cover" /> : <Package className="size-5 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">${p.price.toFixed(2)} &middot; Stock: {p.stock}</p>
                      </div>
                      <Button variant="outline" size="icon" className="size-8 shrink-0" onClick={() => addToCart(p)}
                        disabled={p.stock <= 0} title={p.stock <= 0 ? "Sin stock" : "Agregar"}>
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Package className="size-12 mb-3" />
              <p className="text-sm">No se encontraron productos</p>
            </div>
          )}
        </div>
      </div>

      {/* Cart sidebar */}
      <div className="w-72 shrink-0 flex flex-col bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart className="size-5" />
          <h2 className="font-bold text-lg">Carrito</h2>
          {totalItems > 0 && <span className="ml-auto text-sm text-muted-foreground">{totalItems}</span>}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Store className="size-10 mb-2" />
              <p className="text-sm">Carrito vacío</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.productId} className="flex items-center gap-2 rounded-xl bg-muted/30 p-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">${item.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="size-6" onClick={() => updateQuantity(item.productId, -1)}><Minus className="size-3" /></Button>
                  <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                  <Button variant="ghost" size="icon" className="size-6" onClick={() => updateQuantity(item.productId, 1)}><Plus className="size-3" /></Button>
                  <Button variant="ghost" size="icon" className="size-6 text-red-500" onClick={() => removeFromCart(item.productId)}><Trash2 className="size-3" /></Button>
                </div>
              </div>
            ))
          )}
        </div>

        <Separator className="my-4" />

        <div className="space-y-3">
          {/* Customer section */}
          <div>
            <Label className="text-xs mb-1 block">Cliente</Label>
            {customer ? (
              <div className="rounded-xl bg-muted/30 p-2 mb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="size-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.phone}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="size-6 text-muted-foreground hover:text-red-500" onClick={() => setCustomer(null)}>
                    <Trash2 className="size-3" />
                  </Button>
                </div>
                {customer.documentId && <p className="text-[10px] text-muted-foreground mt-1">Doc: {customer.documentId}</p>}
              </div>
            ) : (
              <div className="relative">
                <div className="flex gap-2 mb-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar cliente..."
                      value={customerSearch}
                      onChange={(e) => { setShowCustomerSearch(true); searchCustomer(e.target.value) }}
                      onFocus={() => setShowCustomerSearch(true)}
                      onBlur={() => setTimeout(() => setShowCustomerSearch(false), 200)}
                      className="text-xs pl-8 h-9"
                    />
                    {showCustomerSearch && customerResults.length > 0 && (
                      <div className="absolute bottom-full mb-1 left-0 right-0 bg-background border border-border rounded-xl shadow-lg z-10 max-h-28 overflow-y-auto">
                        {customerResults.map((c) => (
                          <button key={c.id} type="button" className="w-full px-3 py-1.5 text-left text-xs hover:bg-muted flex items-center gap-2"
                            onMouseDown={() => selectCustomer(c)}>
                            <User className="size-3 text-muted-foreground shrink-0" />
                            <span className="font-medium truncate">{c.name}</span>
                            <span className="text-muted-foreground shrink-0">{c.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs h-9" onClick={openCreateCustomer}>
                  <UserPlus className="size-3.5" /> Crear cliente
                </Button>
              </div>
            )}
          </div>

          {/* Credit days */}
          {creditOptions.length > 0 && (
            <div>
              <Label className="text-xs mb-1 block">Días de crédito</Label>
              <select value={creditDays} onChange={(e) => setCreditDays(e.target.value)}
                className="w-full h-9 rounded-xl border border-border bg-background px-3 text-sm">
                {creditOptions.map((d) => <option key={d} value={d}>{d} días</option>)}
              </select>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-lg font-bold">${subtotal.toFixed(2)}</span>
          </div>
          <Button className="w-full gap-2" size="lg" disabled={loading || cart.length === 0 || !customer} onClick={processSale}>
            <CreditCard className="size-4" />
            {loading ? "Procesando..." : "Procesar venta"}
          </Button>
        </div>
      </div>

      {/* Create customer modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nuevo cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input value={newCustomer.name} onChange={(e) => setNewCustomer((f) => ({ ...f, name: e.target.value }))} placeholder="Nombre completo" />
            </div>
            <div className="space-y-1">
              <Label>Teléfono *</Label>
              <Input value={newCustomer.phone} onChange={(e) => setNewCustomer((f) => ({ ...f, phone: e.target.value }))} placeholder="0412..." />
            </div>
            <div className="space-y-1">
              <Label>Documento / RIF</Label>
              <Input value={newCustomer.documentId} onChange={(e) => setNewCustomer((f) => ({ ...f, documentId: e.target.value }))} placeholder="V-12345678" />
            </div>
            <div className="space-y-1">
              <Label>Dirección</Label>
              <Input value={newCustomer.address} onChange={(e) => setNewCustomer((f) => ({ ...f, address: e.target.value }))} placeholder="Dirección" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={confirmCreateCustomer} className="gap-2"><Check className="size-4" /> Agregar cliente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
