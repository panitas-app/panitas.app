import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore } from "@/lib/permissions"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const current = await getCurrentStore()
    if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          include: {
            items: { include: { product: { select: { name: true } } } },
            payments: true,
          },
        },
      },
    })

    if (!customer || customer.storeId !== current.store.id) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    return NextResponse.json(customer)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
