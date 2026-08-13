"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BadgePercent, Minus, Percent, Plus, ShoppingCart, Trash2, X } from "lucide-react"
import type { CartItem } from "./types"

interface PosCartProps {
  cart: CartItem[]
  totalItems: number
  subtotal: number
  couponCode: string
  couponDiscount: number
  cartDiscount: number
  applyingCoupon: boolean
  onUpdateQuantity: (productId: string, delta: number) => void
  onRemoveItem: (productId: string) => void
  onClearCart: () => void
  onSetLinePrice: (productId: string, price: number) => void
  onCouponCodeChange: (value: string) => void
  onApplyCoupon: () => void
  onCartDiscountChange: (value: number) => void
}

export function PosCart({
  cart,
  totalItems,
  subtotal,
  couponCode,
  couponDiscount,
  cartDiscount,
  applyingCoupon,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onSetLinePrice,
  onCouponCodeChange,
  onApplyCoupon,
  onCartDiscountChange,
}: PosCartProps) {
  return (
    <>
      {/* Cart header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h2 className="font-bold flex items-center gap-1.5 text-sm">
          <ShoppingCart className="size-4" /> Carrito
        </h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{totalItems} ítem(s)</span>
          {cart.length > 0 && (
            <Button variant="ghost" size="icon" className="size-6 text-red-500" onClick={onClearCart}>
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
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[9px] text-muted-foreground">Precio:</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => onSetLinePrice(item.productId, parseFloat(e.target.value) || 0)}
                      className="h-6 w-20 text-xs px-1 py-0"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="outline" size="icon" className="size-6" onClick={() => onUpdateQuantity(item.productId, -1)}>
                    <Minus className="size-3" />
                  </Button>
                  <span className="text-sm font-bold w-7 text-center">{item.quantity}</span>
                  <Button variant="outline" size="icon" className="size-6" onClick={() => onUpdateQuantity(item.productId, 1)}>
                    <Plus className="size-3" />
                  </Button>
                </div>
                <div className="text-right shrink-0 w-16">
                  <p className="text-xs font-bold">${lineTotal.toFixed(2)}</p>
                </div>
                <Button variant="ghost" size="icon" className="size-6 text-red-400 shrink-0" onClick={() => onRemoveItem(item.productId)}>
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
              onChange={(e) => onCouponCodeChange(e.target.value)}
              className="h-8 text-xs flex-1"
              onKeyDown={(e) => e.key === "Enter" && onApplyCoupon()}
            />
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onApplyCoupon} disabled={applyingCoupon}>
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
            onChange={(e) => onCartDiscountChange(Math.max(0, Math.min(subtotal, parseFloat(e.target.value) || 0)))}
            className="h-7 w-20 text-xs px-1"
          />
        </div>
      )}
    </>
  )
}

function StoreIcon() {
  return (
    <svg className="size-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
    </svg>
  )
}
