"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { ArrowLeft, Plus, Trash2, Search, Package, Percent, Users, CreditCard } from "lucide-react"

interface Product {
  id: string
  name: string
  price: number
  stock: number
  images: string
}

interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  stock: number
}

interface Seller {
  id: string
  name: string
}

export default function CreateOrderPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [sellers, setSellers] = useState<Seller[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")
  const [shippingMethod, setShippingMethod] = useState("pickup_store")
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [paymentStatus, setPaymentStatus] = useState("paid")
  const [sellerId, setSellerId] = useState("")
  const [discount, setDiscount] = useState(0)
  const [isEnterprise, setIsEnterprise] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        const [productsRes, storeRes] = await Promise.all([
          fetch("/api/products?limit=100"),
          fetch("/api/stores"),
        ])
        if (productsRes.ok) {
          const data = await productsRes.json()
          setProducts(Array.isArray(data) ? data : data.data)
        }
        if (storeRes.ok) {
          const store = await storeRes.json()
          const planType = store.planType || store.plan || ""
          const isEmp = planType === "empresa" || planType === "empresarial"
          setIsEnterprise(isEmp)
          if (isEmp) {
            const sellersRes = await fetch("/api/sellers?limit=100")
            if (sellersRes.ok) {
              const data = await sellersRes.json()
              setSellers(data.data || data)
            }
          }
        }
      } catch { /* ignore */ }
      finally { setLoading(false) }
    }
    init()
  }, [])

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error("Stock insuficiente")
          return prev
        }
        return prev.map((c) =>
          c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c
        )
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1, stock: product.stock }]
    })
  }

  function updateQuantity(productId: string, qty: number) {
    if (qty < 1) return removeFromCart(productId)
    setCart((prev) =>
      prev.map((c) => {
        if (c.productId !== productId) return c
        if (qty > c.stock) {
          toast.error(`Stock max: ${c.stock}`)
          return c
        }
        return { ...c, quantity: qty }
      })
    )
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((c) => c.productId !== productId))
  }

  const subtotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0)
  const total = Math.max(0, subtotal - discount)

  async function handleSubmit() {
    if (!customerName || !customerPhone) {
      toast.error("Nombre y teléfono del cliente son obligatorios")
      return
    }
    if (cart.length === 0) {
      toast.error("Agrega al menos un producto")
      return
    }
    setSubmitting(true)
    try {
      const body: any = {
        subtotal,
        shippingCost: 0,
        total,
        discount,
        currency: "USD",
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        customerAddress: customerAddress || null,
        shippingMethod,
        items: cart.map((c) => ({
          productId: c.productId,
          quantity: c.quantity,
          price: c.price,
        })),
        payment: paymentMethod !== "cash" ? {
          method: paymentMethod,
          amount: total,
          status: paymentStatus === "paid" ? "verified" : "pending",
        } : undefined,
      }
      if (isEnterprise && sellerId) {
        body.sellerId = sellerId
      }
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al crear el pedido")
      }
      const order = await res.json()
      toast.success("Pedido creado exitosamente")
      router.push(`/dashboard/orders/${order.id}`)
    } catch (error: any) {
      toast.error(error.message || "Error al crear el pedido")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/orders")}>
        <ArrowLeft className="size-4" />
        Volver a pedidos
      </Button>

      <h1 className="font-heading text-xl font-semibold">Crear orden manual</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* Customer info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Datos del cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nombre del cliente" />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono *</Label>
                  <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+58 412-1234567" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="cliente@email.com" type="email" />
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Dirección de entrega (si aplica)" />
              </div>
            </CardContent>
          </Card>

          {/* Shipping method */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Método de envío</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={shippingMethod} onValueChange={(v) => v !== null && setShippingMethod(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pickup_store">Retiro en tienda</SelectItem>
                  <SelectItem value="pickup_agency">Envío por agencia</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Información de pago</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Método de pago</Label>
                <Select value={paymentMethod} onValueChange={(v) => v !== null && (setPaymentMethod(v), v === "cash" && setPaymentStatus("paid"))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="bank_transfer">Transferencia</SelectItem>
                    <SelectItem value="pago_movil">Pago Móvil</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="zelle">Zelle</SelectItem>
                    <SelectItem value="divisas">Divisas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado del pago</Label>
                <div className={isEnterprise ? "flex gap-2" : ""}>
                  {isEnterprise ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setPaymentStatus("paid")}
                        className={`flex-1 rounded-lg border py-2 text-center text-sm font-medium transition-colors ${
                          paymentStatus === "paid"
                            ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                            : "hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                      >
                        <CreditCard className="mx-auto mb-0.5 size-4" />
                        Pagado
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentStatus("pending")}
                        className={`flex-1 rounded-lg border py-2 text-center text-sm font-medium transition-colors ${
                          paymentStatus === "pending"
                            ? "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
                            : "hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                      >
                        <Percent className="mx-auto mb-0.5 size-4" />
                        Por Cobrar
                      </button>
                    </>
                  ) : (
                    <Select value={paymentStatus} onValueChange={(v) => v !== null && setPaymentStatus(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">Pagado</SelectItem>
                        <SelectItem value="pending">Pendiente</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {isEnterprise && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Users className="size-3.5" /> Vendedor
                  </Label>
                  <select
                    value={sellerId}
                    onChange={(e) => setSellerId(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="">Sin vendedor</option>
                    {sellers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Product search */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Agregar productos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar producto..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {loading ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">Cargando productos...</p>
                ) : filteredProducts.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">No hay productos</p>
                ) : (
                  filteredProducts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">${p.price.toFixed(2)} | Stock: {p.stock}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="size-8 shrink-0" onClick={() => addToCart(p)} disabled={p.stock < 1}>
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cart summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Resumen ({cart.length} producto{cart.length !== 1 ? "s" : ""})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cart.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Selecciona productos de la lista</p>
              ) : (
                cart.map((c) => (
                  <div key={c.productId} className="flex items-center gap-2 rounded-lg border p-2">
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-medium">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">${c.price.toFixed(2)} c/u</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="xs" variant="outline" className="size-6 p-0" onClick={() => updateQuantity(c.productId, c.quantity - 1)}>-</Button>
                      <span className="w-6 text-center text-xs font-medium">{c.quantity}</span>
                      <Button size="xs" variant="outline" className="size-6 p-0" onClick={() => updateQuantity(c.productId, c.quantity + 1)}>+</Button>
                    </div>
                    <p className="w-14 text-right text-xs font-semibold">${(c.price * c.quantity).toFixed(2)}</p>
                    <Button size="xs" variant="ghost" className="size-6 p-0 text-destructive" onClick={() => removeFromCart(c.productId)}>
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                ))
              )}
              <Separator />
              {isEnterprise && (
                <div className="space-y-1">
                  <Label className="text-xs">Descuento ($)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={subtotal}
                    value={discount}
                    onChange={(e) => setDiscount(Math.max(0, Math.min(subtotal, Number(e.target.value) || 0)))}
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total</span>
                <span className="text-lg font-bold">${total.toFixed(2)}</span>
              </div>
              <Button className="w-full gap-2" disabled={cart.length === 0 || submitting} onClick={handleSubmit}>
                <Package className="size-4" />
                {submitting ? "Creando..." : "Crear pedido"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
