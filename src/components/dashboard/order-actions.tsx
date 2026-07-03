"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { MoreHorizontal } from "lucide-react"
import type { Order } from "@prisma/client"

const statusActions = [
  { value: "confirmed", label: "Confirmar pago" },
  { value: "preparing", label: "Marcar como preparando" },
  { value: "shipped", label: "Marcar como enviado" },
  { value: "delivered", label: "Marcar como entregado" },
  { value: "cancelled", label: "Cancelar pedido" },
]

export function OrderActions({ order }: { order: Order }) {
  const router = useRouter()

  async function updateStatus(status: string) {
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error("Error")
      toast.success("Estado actualizado")
      router.refresh()
    } catch {
      toast.error("Error al actualizar el estado")
    }
  }

  const nextActions = statusActions.filter((a) => {
    const orderIndex = statusActions.findIndex((s) => s.value === order.status)
    const actionIndex = statusActions.findIndex((s) => s.value === a.value)
    return actionIndex > orderIndex || (a.value === "cancelled" && order.status !== "cancelled" && order.status !== "delivered")
  })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm">
        <MoreHorizontal className="size-4" />
        Acciones
      </Button>} />
      <DropdownMenuContent align="end">
        {nextActions.map((action) => (
          <DropdownMenuItem
            key={action.value}
            onSelect={() => {
              if (action.value === "cancelled" && !confirm("¿Estás seguro de cancelar este pedido? Se restaurará el inventario.")) return
              updateStatus(action.value)
            }}
          >
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
