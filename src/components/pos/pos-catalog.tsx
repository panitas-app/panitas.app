"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronDown, ChevronRight, Package, ScanLine, Smartphone } from "lucide-react"
import type { Category, Product, ScannerStatus } from "./types"

interface PosCatalogProps {
  products: Product[]
  categories: Category[]
  search: string
  selectedCategory: string
  collapsedCats: Set<string>
  scannerStatus: ScannerStatus
  onSearchChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onToggleCat: (id: string) => void
  onAddToCart: (product: Product) => void
  onRefresh: () => void
  onScannerButton: () => void
  calcWholesalePrice: (product: Product, qty: number) => { price: number; wholesale: boolean }
}

export function PosCatalog({
  products,
  categories,
  search,
  selectedCategory,
  collapsedCats,
  scannerStatus,
  onSearchChange,
  onCategoryChange,
  onToggleCat,
  onAddToCart,
  onRefresh,
  onScannerButton,
  calcWholesalePrice,
}: PosCatalogProps) {
  const filteredProducts = products
    .filter((p) => {
      if (!search) return true
      const q = search.toLowerCase()
      return p.name.toLowerCase().includes(q) || (p.sku?.toLowerCase() || "").includes(q) || (p.barcode?.toLowerCase() || "").includes(q)
    })
    .filter((p) => selectedCategory === "all" || p.categoryId === selectedCategory)

  const groupedProducts = categories
    .filter((c) => filteredProducts.some((p) => p.categoryId === c.id))
    .map((c) => ({ category: c, products: filteredProducts.filter((p) => p.categoryId === c.id) }))
  const uncategorized = filteredProducts.filter((p) => !p.categoryId)

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-card border-r border-border">
      {/* Search bar */}
      <div className="flex items-center gap-2 p-3 border-b border-border shrink-0">
        <div className="relative flex-1">
          <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o SKU (escáner)..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 text-sm"
            autoFocus
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-2 text-xs max-w-32"
        >
          <option value="all">Todas</option>
          {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
        </select>
        <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={onRefresh}>
          <Package className="size-3.5" /> Refrescar
        </Button>
        <Button
          variant={scannerStatus === "connected" ? "default" : "secondary"}
          size="sm"
          className={`gap-1.5 text-xs ${scannerStatus === "connected" ? "bg-green-600 hover:bg-green-700" : ""}`}
          onClick={onScannerButton}
        >
          <Smartphone className="size-3.5" />
          {scannerStatus === "connected" ? "Conectado" : "Lector"}
        </Button>
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {groupedProducts.map(({ category, products }) => (
          <div key={category.id}>
            <button onClick={() => onToggleCat(category.id)} className="flex items-center gap-2 text-sm font-bold mb-2 hover:text-primary transition-colors w-full text-left">
              {collapsedCats.has(category.id) ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
              {category.name} <span className="text-muted-foreground font-normal text-xs">({products.length})</span>
            </button>
            {!collapsedCats.has(category.id) && (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {products.map((p) => {
                  const { price: wholesalePrice, wholesale } = calcWholesalePrice(p, 2)
                  return (
                    <ProductCard
                      key={p.id}
                      product={p}
                      price={wholesale ? wholesalePrice : p.price}
                      wholesale={wholesale}
                      onAdd={() => onAddToCart(p)}
                    />
                  )
                })}
              </div>
            )}
          </div>
        ))}
        {uncategorized.length > 0 && (
          <div>
            <button onClick={() => onToggleCat("__uncat")} className="flex items-center gap-2 text-sm font-bold mb-2 hover:text-primary transition-colors w-full text-left">
              {collapsedCats.has("__uncat") ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
              Sin categoría <span className="text-muted-foreground font-normal text-xs">({uncategorized.length})</span>
            </button>
            {!collapsedCats.has("__uncat") && (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {uncategorized.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    price={p.price}
                    wholesale={false}
                    onAdd={() => onAddToCart(p)}
                  />
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
  )
}

function ProductCard({ product, price, wholesale, onAdd }: { product: Product; price: number; wholesale: boolean; onAdd: () => void }) {
  return (
    <Card className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-sm active:scale-[0.98]" onClick={onAdd}>
      <CardContent className="p-2">
        <div className="aspect-square rounded-md bg-muted flex items-center justify-center mb-1.5 overflow-hidden relative">
          {product.images ? (
            <img src={JSON.parse(product.images)[0]} alt={product.name} className="size-full object-cover" />
          ) : (
            <Package className="size-6 text-muted-foreground" />
          )}
          {wholesale && (
            <span className="absolute top-1 right-1 bg-amber-500 text-white text-[8px] font-bold px-1 py-0.5 rounded">$ MAYOR</span>
          )}
          {product.stock <= 0 && (
            <span className="absolute bottom-1 left-1 bg-red-500 text-white text-[8px] font-bold px-1 py-0.5 rounded">AGOTADO</span>
          )}
        </div>
        <p className="text-xs font-semibold truncate leading-tight">{product.name}</p>
        {product.sku && <p className="text-[9px] text-muted-foreground truncate">SKU: {product.sku}</p>}
        <div className="flex items-center justify-between mt-1">
          <p className={`text-xs font-bold ${wholesale ? "text-amber-600" : ""}`}>
            ${price.toFixed(2)}
          </p>
          <p className="text-[9px] text-muted-foreground">{product.stock} uds</p>
        </div>
      </CardContent>
    </Card>
  )
}
