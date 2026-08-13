import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore } from "@/lib/permissions"
import { CreditService } from "@/services/credit.service"

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

    const creditService = new CreditService()
    const credits = await creditService.listByCustomer(
      { storeId: current.store.id, userId: current.userId },
      id
    )
    const creditBalance = credits.reduce((sum, c) => sum + c.pending, 0)
    const activeCredits = credits.length

    return NextResponse.json({ ...customer, creditBalance, activeCredits })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
