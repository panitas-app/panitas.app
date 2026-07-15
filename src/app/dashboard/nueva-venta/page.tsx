"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Plus, Minus, Trash2, Search, User, Phone, CreditCard, Package, ShoppingCart, Store } from "lucide-react"
import posthog from "posthog-js"

interface Product {
  id: string
  name: string
  price: number
  stock: number
  images: string
  categoryId: string | null
  category: { id: string; name: string } | null
}

interface Category {
  id: string
  name: string
}

interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  stock: number
}

interface Customer {
  id: string
  name: string
  phone: string
}

export default function NuevaVentaPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [loading, setLoading] = useState(false)

  // Customer
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerSearch, setCustomerSearch] = useState("")
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)

  // Credit
  const [creditDays, setCreditDays] = useState("")
  const [creditOptions, setCreditOptions] = useState<string[]>([])

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    try {
      const res = await fetch("/api/products?limit=200")
      const data = await res.json()
      const list = Array.isArray(data) ? data : data.data || []
      setProducts(list)
      const cats = list
        .filter((p: Product) => p.category)
        .map((p: Product) => p.category)
        .filter((c: Category, i: number, arr: Category[]) => arr.findIndex((x) => x.id === c.id) === i)
      setCategories(cats)
    } catch {
      toast.error("Error al cargar productos")
    }
  }

  useEffect(() => {
    async function loadStore() {
      try {
        const res = await fetch("/api/stores")
        if (res.ok) {
          const store = await res.json()
          const days = store.creditDays || "5,10,15,30"
          const opts = days.split(",").map((d: string) => d.trim()).filter((d: string) => d)
          setCreditOptions(opts)
          if (opts.length > 0) setCreditDays(opts[0])
        }
      } catch (e) { console.error("[unhandled error]", e) }
    }
    loadStore()
  }, [])

  async function searchCustomer(q: string) {
    setCustomerSearch(q)
    if (q.length < 3) {
      setCustomerResults([])
      return
    }
    try {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setCustomerResults(data.data || [])
      }
    } catch (e) { console.error("[unhandled error]", e) }
  }
  
  function selectCustomer(c: Customer) {
    setCustomerName(c.name)
    setCustomerPhone(c.phone)
    setCustomerSearch("")
    setCustomerResults([])
    setShowCustomerSearch(false)
  }

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error("Stock insuficiente")
          return prev
        }
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1, stock: product.stock }]
    })
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId !== productId) return item
          const newQty = item.quantity + delta
          if (newQty <= 0) return null
          if (newQty > item.stock) {
            toast.error("Stock insuficiente")
            return item
          }
          return { ...item, quantity: newQty }
        })
        .filter(Boolean) as CartItem[]
    )
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((item) => item.productId !== productId))
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchCategory = selectedCategory === "all" || p.categoryId === selectedCategory
    return matchSearch && matchCategory
  })

  const groupedProducts = categories
    .filter((c) => filteredProducts.some((p) => p.categoryId === c.id))
    .map((c) => ({
      category: c,
      products: filteredProducts.filter((p) => p.categoryId === c.id),
    }))
  const uncategorized = filteredProducts.filter((p) => !p.categoryId)

  async function processSale() {
    if (cart.length === 0) {
      toast.error("Agrega productos al carrito")
      return
    }
    if (!customerName || !customerPhone) {
      toast.error("Ingresa nombre y teléfono del cliente")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          shippingMethod: "pickup_store",
          payment: {
            method: "credit",
            amount: subtotal,
            status: "pending",
          },
          creditDays: parseInt(creditDays) || 0,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al procesar")
      }
      const order = await res.json()
      toast.success(`Venta #${order.orderNumber} creada`)
      posthog.capture("pos_sale_completed", {
        order_number: order.orderNumber,
        total_usd: subtotal,
        item_count: totalItems,
        credit_days: parseInt(creditDays) || 0,
      })
      setCart([])
      setCustomerName("")
      setCustomerPhone("")
      router.refresh()
      router.push(`/dashboard/orders/${order.id}`)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4">
      {/* Left: Products */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="mb-4 flex items-center gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar productos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
          >
            <option value="all">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6">
          {groupedProducts.map(({ category, products }) => (
            <div key={category.id}>
              <h3 className="text-lg font-bold mb-3">{category.name}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {products.map((p) => (
                  <Card key={p.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => addToCart(p)}>
                    <CardContent className="p-3">
                      <div className="aspect-square rounded-lg bg-muted flex items-center justify-center mb-2 overflow-hidden">
                        {p.images ? (
                          <img src={JSON.parse(p.images)[0]} alt={p.name} className="size-full object-cover" />
                        ) : (
                          <Package className="size-8 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-sm font-semibold truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">${p.price.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">Stock: {p.stock}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {uncategorized.length > 0 && (
            <div>
              <h3 className="text-lg font-bold mb-3">Sin categoría</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {uncategorized.map((p) => (
                  <Card key={p.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => addToCart(p)}>
                    <CardContent className="p-3">
                      <div className="aspect-square rounded-lg bg-muted flex items-center justify-center mb-2 overflow-hidden">
                        {p.images ? (
                          <img src={JSON.parse(p.images)[0]} alt={p.name} className="size-full object-cover" />
                        ) : (
                          <Package className="size-8 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-sm font-semibold truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">${p.price.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">Stock: {p.stock}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
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

      {/* Right: Cart */}
      <div className="w-80 shrink-0 flex flex-col bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart className="size-5" />
          <h2 className="font-bold text-lg">Carrito</h2>
          {totalItems > 0 && (
            <span className="ml-auto text-sm text-muted-foreground">{totalItems} items</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Store className="size-10 mb-2" />
              <p className="text-sm">Carrito vacío</p>
              <p className="text-xs mt-1">Selecciona productos</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.productId} className="flex items-center gap-2 rounded-xl bg-muted/30 p-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">${item.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => updateQuantity(item.productId, -1)}>
                    <Minus className="size-3" />
                  </Button>
                  <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => updateQuantity(item.productId, 1)}>
                    <Plus className="size-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-7 text-red-500" onClick={() => removeFromCart(item.productId)}>
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <Separator className="my-4" />

        <div className="space-y-3">
          {/* Customer */}
          <div>
            <Label className="text-xs mb-1 block">Cliente</Label>
            <div className="relative">
              <Input
                placeholder="Buscar cliente por teléfono o nombre..."
                value={showCustomerSearch ? customerSearch : customerName}
                onChange={(e) => {
                  if (showCustomerSearch) {
                    searchCustomer(e.target.value)
                  } else {
                    setCustomerName(e.target.value)
                  }
                }}
                onFocus={() => setShowCustomerSearch(true)}
                onBlur={() => setTimeout(() => setShowCustomerSearch(false), 200)}
                className="text-sm"
              />
              {showCustomerSearch && customerResults.length > 0 && (
                <div className="absolute bottom-full mb-1 left-0 right-0 bg-background border border-border rounded-xl shadow-lg z-10 max-h-32 overflow-y-auto">
                  {customerResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                      onMouseDown={() => selectCustomer(c)}
                    >
                      <User className="size-3.5 text-muted-foreground" />
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted-foreground text-xs ml-auto">{c.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Teléfono</Label>
            <Input
              placeholder="0412..."
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* Credit days */}
          {creditOptions.length > 0 && (
            <div>
              <Label className="text-xs mb-1 block">Días de crédito</Label>
              <select
                value={creditDays}
                onChange={(e) => setCreditDays(e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
              >
                {creditOptions.map((d) => (
                  <option key={d} value={d}>{d} días</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-muted-foreground">Total USD</span>
            <span className="text-lg font-bold">${subtotal.toFixed(2)}</span>
          </div>

          <Button
            className="w-full gap-2"
            size="lg"
            disabled={loading || cart.length === 0}
            onClick={processSale}
          >
            <CreditCard className="size-4" />
            {loading ? "Procesando..." : `Procesar venta (${totalItems} items)`}
          </Button>
        </div>
      </div>
    </div>
  )
}
