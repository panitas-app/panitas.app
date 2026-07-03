"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ImageOffIcon, Plus } from "lucide-react"

interface ProductCardProduct {
  id: string
  name: string
  price: number
  images: string[]
  stock: number | null
  category?: { id: string; name: string; slug: string } | null
}

interface ProductCardProps {
  product: ProductCardProduct
  onAddToCart: (product: ProductCardProduct) => void
  bcvRate: number
  accentColor: string
}

export function ProductCard({ product, onAddToCart, bcvRate, accentColor }: ProductCardProps) {
  const outOfStock = product.stock !== null && product.stock <= 0
  const imageUrl = product.images?.[0] || null
  const priceVes = product.price * bcvRate

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:shadow-sm">
      {/* Square image area */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground/40">
            <ImageOffIcon className="size-8" />
          </div>
        )}
        {outOfStock ? (
          <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-md border-0">
            Agotado
          </Badge>
        ) : product.stock !== null && product.stock <= 5 ? (
          <Badge className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md border-0">
            Últimas {product.stock}
          </Badge>
        ) : null}
      </div>

      {/* Central area: title + pricing */}
      <div className="flex flex-1 flex-col gap-1.5 px-3 pt-3 pb-2">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide leading-snug line-clamp-2">
          {product.name}
        </h3>
        <div>
          <p className="text-base font-bold text-foreground">
            ${product.price.toFixed(2)}
          </p>
          <p className="text-[11px] text-muted-foreground/70">
            Bs. {priceVes.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Bottom: add button */}
      <div className="px-3 pb-3">
        <button
          disabled={outOfStock}
          onClick={() => onAddToCart(product)}
          className={`flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition-all active:scale-[0.97] ${
            outOfStock
              ? "bg-muted text-muted-foreground/50 cursor-not-allowed"
              : "text-primary-foreground hover:brightness-105"
          }`}
          style={!outOfStock ? { backgroundColor: accentColor } : {}}
        >
          <Plus className="size-3.5" />
          {outOfStock ? "Agotado" : "Agregar"}
        </button>
      </div>
    </div>
  )
}
