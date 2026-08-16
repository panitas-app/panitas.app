"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatBCV } from "@/lib/bcv/format"
import { Download, Plus, Printer, Receipt } from "lucide-react"

interface ReceiptModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lastOrder: any
  showBolivares: boolean
  bcvRate: number
  onPrint: () => void
  onDownloadPDF: () => void
  onNewSale: () => void
}

export function ReceiptModal({
  open,
  onOpenChange,
  lastOrder,
  showBolivares,
  bcvRate,
  onPrint,
  onDownloadPDF,
  onNewSale,
}: ReceiptModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

              {(() => {
                const items = lastOrder.items || []
                const productLines = items.filter((it: any) => it.type !== "CUSTOM")
                const conceptLines = items.filter((it: any) => it.type === "CUSTOM")
                return (
                  <>
                    {productLines.map((item: any, i: number) => (
                      <div key={`p-${i}`} className="flex justify-between">
                        <span className="flex-1">{item.productName || item.product?.name} x{item.quantity}</span>
                        <span className="font-bold">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    {conceptLines.length > 0 && (
                      <>
                        <div className="text-center border-t border-dashed pt-1 mt-1">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Conceptos adicionales</p>
                        </div>
                        {conceptLines.map((item: any, i: number) => (
                          <div key={`c-${i}`} className="flex justify-between">
                            <span className="flex-1">{item.productName || item.name} x{item.quantity}</span>
                            <span className="font-bold">${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </>
                )
              })()}

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
                {showBolivares && bcvRate > 0 && <p>Tasa BCV: Bs. {formatBCV(bcvRate)} / USD</p>}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" className="gap-1.5 text-xs flex-1" onClick={onPrint}>
            <Printer className="size-4" /> Imprimir
          </Button>
          <Button variant="outline" className="gap-1.5 text-xs flex-1" onClick={onDownloadPDF}>
            <Download className="size-4" /> PDF
          </Button>
          <Button className="gap-1.5 text-xs flex-1" onClick={onNewSale}>
            <Plus className="size-4" /> Nueva venta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
