"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LoadingState } from "@/components/ui/loading-state"
import { EmptyState } from "@/components/ui/empty-state"
import { ProductStockHistory } from "@/components/dashboard/product-stock-history"
import {
  ArrowLeft,
  Pencil,
  PackagePlus,
  Tag,
  DollarSign,
  Package,
  Store,
  Layers,
  ScanBarcode,
  FileText,
  MessageCircleQuestion,
} from "lucide-react"
import { toast } from "sonner"

type Product = {
  id: string
  name: string
  description: string | null
  price: number
  costPrice: number | null
  sku: string | null
  barcode: string | null
  images: string
  stock: number
  isActive: boolean
  unidadBase: string
  productType: string
  isWholesale: boolean
  wholesaleLabel: string | null
  wholesalePrice: number | null
  wholesaleScales: string | null
  hasSizes: boolean
  sizes: string | null
  category: { id: string; name: string } | null
}

function money(n: number): string {
  return "$" + n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseJson<T>(raw: string | null): T[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function ProductDetail({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  const [stockOpen, setStockOpen] = useState(false)
  const [stockType, setStockType] = useState("increase")
  const [stockQty, setStockQty] = useState("")
  const [stockConcept, setStockConcept] = useState("")
  const [stockSaving, setStockSaving] = useState(false)

  const fetchProduct = useCallback(async () => {
    try {
      const res = await fetch(`/api/products/${productId}`)
      if (res.ok) {
        setProduct(await res.json())
      } else {
        setProduct(null)
      }
    } catch (e) { console.error("[unhandled error]", e) } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => { fetchProduct() }, [fetchProduct])

  async function handleStock() {
    const qty = Number(stockQty)
    if (!Number.isFinite(qty) || qty < 0) {
      toast.error(stockType === "adjustment" ? "Ingresa un stock válido" : "Ingresa una cantidad válida")
      return
    }
    if ((stockType === "increase" || stockType === "decrease") && qty === 0) {
      toast.error("La cantidad debe ser mayor a 0")
      return
    }
    setStockSaving(true)
    try {
      const res = await fetch("/api/products/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          type: stockType,
          quantity: qty,
          concept: stockConcept.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        toast.error(err?.error || "Error al ajustar el stock")
        return
      }
      toast.success("Stock actualizado")
      setStockOpen(false)
      setStockQty("")
      setStockConcept("")
      fetchProduct()
    } catch {
      toast.error("Error al ajustar el stock")
    } finally {
      setStockSaving(false)
    }
  }

  if (loading) {
    return <LoadingState message="Cargando producto..." />
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-4xl">
        <EmptyState
          icon={Package}
          title="Producto no encontrado"
          description="Es posible que haya sido eliminado o que no tengas acceso a él."
          action={
            <Link href="/dashboard/products">
              <Button variant="outline">Volver al inventario</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const images = parseJson<string>(product.images)
  const scales = parseJson<{ quantity: number; price: number }>(product.wholesaleScales)
  const sizes = parseJson<{ size: string; stock?: number | null }>(product.sizes)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/dashboard/products"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="size-4" />
          Inventario
        </Link>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            {images[0] ? (
              <img src={images[0]} alt={product.name} className="size-14 rounded-xl object-cover" />
            ) : (
              <div className="flex size-14 items-center justify-center rounded-xl bg-muted">
                <Package className="size-6 text-muted-foreground" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-heading text-xl font-semibold">{product.name}</h1>
                <Badge variant={product.isActive ? "default" : "secondary"}>
                  {product.isActive ? "Activo" : "Inactivo"}
                </Badge>
              </div>
              {product.sku && <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/dashboard/products/${product.id}/edit`}>
              <Button variant="outline">
                <Pencil className="size-4" />
                Editar
              </Button>
            </Link>
            <Button onClick={() => setStockOpen(true)}>
              <PackagePlus className="size-4" />
              Ajustar stock
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-4">
            <DollarSign className="size-5 text-primary" />
            <span className="text-2xl font-black text-accent">{money(product.price)}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Precio</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-4">
            <Tag className="size-5 text-info" />
            <span className="text-2xl font-black text-accent">{product.costPrice !== null ? money(product.costPrice) : "—"}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Costo</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-4">
            <Package className={`size-5 ${product.stock === 0 ? "text-destructive" : product.stock <= 5 ? "text-warning" : "text-success"}`} />
            <span className="text-2xl font-black text-accent">{product.stock}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Stock</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-4">
            <Store className="size-5 text-warning" />
            <span className="text-2xl font-black text-accent">{money(product.price * product.stock)}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Valor inventario</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {product.description && (
            <div className="flex gap-2">
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <p className="text-muted-foreground">{product.description}</p>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {product.barcode && (
              <div className="flex items-center gap-2">
                <ScanBarcode className="size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Código de barras</p>
                  <p className="text-foreground">{product.barcode}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Layers className="size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Categoría</p>
                <p className="text-foreground">{product.category?.name ?? "Sin categoría"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Package className="size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Unidad base</p>
                <p className="text-foreground">{product.unidadBase}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tipo</p>
                <p className="text-foreground">{product.productType === "digital" ? "Digital" : "Físico"}</p>
              </div>
            </div>
          </div>

          {product.isWholesale && (
            <div className="rounded-xl border border-border bg-muted/50 p-3">
              <p className="text-sm font-semibold">{product.wholesaleLabel ?? "Venta mayorista"}</p>
              <p className="text-xs text-muted-foreground">
                Precio mayorista: {product.wholesalePrice !== null ? money(product.wholesalePrice) : "—"}
              </p>
              {scales.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {scales.map((s, i) => (
                    <Badge key={i} variant="outline">{s.quantity}+ uds · {money(s.price)}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {product.hasSizes && sizes.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Tallas</p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s, i) => (
                  <Badge key={i} variant={s.stock === 0 ? "destructive" : "secondary"}>
                    {s.size} {s.stock !== null && s.stock !== undefined ? `· ${s.stock}` : ""}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ProductStockHistory productId={product.id} />

      <div className="flex justify-center">
        <Link
          href={`/dashboard/assistant?q=${encodeURIComponent(`¿Cómo está el inventario de ${product.name}?`)}`}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:text-primary hover:border-primary/40 transition-colors"
        >
          <MessageCircleQuestion className="size-4 text-primary" />
          Preguntar a Panitas
        </Link>
      </div>

      <Dialog open={stockOpen} onOpenChange={setStockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar stock</DialogTitle>
            <DialogDescription>
              Registra una entrada, salida o ajuste de inventario para {product.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="stock-type" className="mb-1.5 block text-xs font-semibold text-muted-foreground">Tipo de movimiento</label>
              <Select value={stockType} onValueChange={(v) => v !== null && setStockType(v)}>
                <SelectTrigger id="stock-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">Entrada (+)</SelectItem>
                  <SelectItem value="decrease">Salida (−)</SelectItem>
                  <SelectItem value="adjustment">Ajuste (fijar stock)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="stock-qty" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                {stockType === "adjustment" ? "Nuevo stock" : "Cantidad"}
              </label>
              <Input
                id="stock-qty"
                type="number"
                min={0}
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                placeholder={stockType === "adjustment" ? "Ej: 25" : "Ej: 10"}
              />
            </div>
            <div>
              <label htmlFor="stock-concept" className="mb-1.5 block text-xs font-semibold text-muted-foreground">Concepto (opcional)</label>
              <Input
                id="stock-concept"
                value={stockConcept}
                onChange={(e) => setStockConcept(e.target.value)}
                placeholder="Ej: reposición semanal"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStockOpen(false)}>Cancelar</Button>
            <Button onClick={handleStock} disabled={stockSaving}>
              {stockSaving ? "Guardando..." : "Guardar movimiento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
