"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Plus, Tags } from "lucide-react"

export interface ConceptFormData {
  description: string
  quantity: number
  price: number
}

interface ConceptModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: boolean
  initial: ConceptFormData
  onSave: (data: ConceptFormData) => void
}

export function ConceptModal({ open, onOpenChange, editing, initial, onSave }: ConceptModalProps) {
  const [description, setDescription] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [price, setPrice] = useState("")
  const initialRef = useRef(initial)

  useEffect(() => {
    if (open) {
      initialRef.current = initial
      const data = initialRef.current
      setDescription(data.description)
      setQuantity(String(data.quantity || 1))
      setPrice(String(data.price))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleSave() {
    const qty = Number(quantity)
    const priceNum = Number(price)
    if (!description.trim()) return
    if (!Number.isInteger(qty) || qty < 1) return
    if (price === "" || !Number.isFinite(priceNum) || priceNum < 0) return
    onSave({ description: description.trim(), quantity: qty, price: priceNum })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="size-5" />
            {editing ? "Editar concepto" : "Agregar concepto"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Descripción *</span>
            <Input
              autoFocus
              placeholder="Ej: Mano de obra, Instalación, Topper"
              value={description}
              maxLength={200}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Cantidad *</span>
              <Input
                type="number"
                min={1}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Precio unitario ($) *</span>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={price}
                placeholder="0.00"
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Un concepto adicional no afecta el inventario y se incluye en el subtotal y total de la venta.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="text-xs flex-1" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="text-xs flex-1 gap-1.5"
            disabled={!description.trim() || !Number.isInteger(Number(quantity)) || Number(quantity) < 1 || price === "" || !Number.isFinite(Number(price)) || Number(price) < 0}
            onClick={handleSave}
          >
            <Plus className="size-4" />
            {editing ? "Guardar" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
