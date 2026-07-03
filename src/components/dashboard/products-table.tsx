"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"

export function DeleteProductButton({ productId }: { productId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm("¿Estás seguro? Esta acción no se puede deshacer.")) return
    setLoading(true)
    try {
      const res = await fetch(`/api/products/${productId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Error")
      toast.success("Producto eliminado")
      setOpen(false)
      router.refresh()
    } catch {
      toast.error("Error al eliminar el producto")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="xs">
        <Trash2 className="size-3.5 text-destructive" />
      </Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar producto</DialogTitle>
          <DialogDescription>
            ¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
