import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSellerFromCookies } from "@/lib/seller-auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getSellerFromCookies()
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        payments: { include: { paymentAccount: true } },
        store: { include: { user: { select: { name: true, email: true } } } },
      },
    })

    if (!order || order.sellerId !== session.sellerId) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch {
    return NextResponse.json({ error: "Error al obtener pedido" }, { status: 500 })
  }
}
