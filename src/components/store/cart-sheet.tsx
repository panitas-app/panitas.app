"use client"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Trash2Icon, MinusIcon, PlusIcon, ShoppingCartIcon } from "lucide-react"

export interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  image?: string | null
}

interface CartSheetProps {
  items: CartItem[]
  onUpdateQty: (productId: string, qty: number) => void
  onRemove: (productId: string) => void
  onCheckout: () => void
  isOpen: boolean
  onClose: () => void
}

export function CartSheet({ items, onUpdateQty, onRemove, onCheckout, isOpen, onClose }: CartSheetProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent side="right" className="flex flex-col w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCartIcon className="size-4" />
            Carrito ({totalItems})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
            <ShoppingCartIcon className="size-12" />
            <p>Tu carrito está vacío</p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-4">
              <div className="flex flex-col gap-3">
                {items.map((item) => (
                  <div key={item.productId} className="flex gap-3">
                    <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="size-full object-cover" />
                      ) : (
                        <div className="flex size-full items-center justify-center text-muted-foreground text-xs">
                          Sin img
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-between">
                      <p className="text-sm font-medium leading-snug">{item.name}</p>
                      <p className="text-sm text-muted-foreground">${(item.price * item.quantity).toFixed(2)}</p>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon-xs"
                          onClick={() => onUpdateQty(item.productId, item.quantity - 1)}
                        >
                          <MinusIcon className="size-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon-xs"
                          onClick={() => onUpdateQty(item.productId, item.quantity + 1)}
                        >
                          <PlusIcon className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="ml-auto text-destructive"
                          onClick={() => onRemove(item.productId)}
                        >
                          <Trash2Icon className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Separator />

            <div className="px-4 pb-4">
              <div className="flex justify-between text-sm mb-4">
                <span>Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <Button className="w-full" onClick={onCheckout}>
                Ir al carrito
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
