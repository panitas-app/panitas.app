import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore } from "@/lib/permissions"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const current = await getCurrentStore()
    if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        subtotal: true,
        discount: true,
        shippingCost: true,
        total: true,
        bcvRateAtOrder: true,
        paymentStatus: true,
        customerId: true,
        customerName: true,
        customerPhone: true,
        customerEmail: true,
        customerAddress: true,
        customerCity: true,
        customerState: true,
        shippingMethod: true,
        shippingAgency: true,
        shippingAgencyAddress: true,
        shippingAddress: true,
        clientNotified: true,
        creditTerm: true,
        posPin: true,
        createdAt: true,
        updatedAt: true,
        storeId: true,
      },
    })

    if (!order || order.storeId !== current.store.id) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const [items, payments, store] = await Promise.all([
      prisma.orderItem.findMany({
        where: { orderId: id },
        include: { product: { select: { name: true, price: true, images: true } } },
      }),
      prisma.orderPayment.findMany({
        where: { orderId: id },
        include: { paymentAccount: true },
      }),
      prisma.store.findUnique({
        where: { id: order.storeId },
        select: { name: true, whatsapp: true, email: true, phone: true },
      }),
    ])

    return NextResponse.json({ ...order, items, payments, store })
  } catch (error) {
    console.error("Error fetching order:", error)
    return NextResponse.json({ error: "Error al cargar el pedido" }, { status: 500 })
  }
}
