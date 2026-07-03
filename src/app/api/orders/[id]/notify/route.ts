import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(req)
  if (csrf) return csrf
  try {
    const { store } = await requireRole(["admin", "manager"])
    const { id } = await params

    const existing = await prisma.order.findUnique({ where: { id }, select: { storeId: true } })
    if (!existing || existing.storeId !== store.id) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 })
    }

    const order = await prisma.order.update({
      where: { id },
      data: { clientNotified: true },
    })

    return NextResponse.json(order)
  } catch (error) {
    if (error instanceof Error && error.message.includes("No tienes")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error marking client as notified:", error)
    return NextResponse.json({ error: "Error al marcar como notificado" }, { status: 500 })
  }
}
