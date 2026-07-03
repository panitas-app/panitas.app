import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore } from "@/lib/permissions"
import { getPaginationParams, paginatedResponse } from "@/lib/pagination"

export async function GET(req: Request) {
  try {
    const current = await getCurrentStore()
    if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const { skip, take, page } = getPaginationParams(searchParams)
    const q = searchParams.get("q") || ""
    const sort = searchParams.get("sort") || "name"
    const order = searchParams.get("order") || "asc"

    const where: any = { storeId: current.store.id }
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { email: { contains: q, mode: "insensitive" } },
        { documentId: { contains: q, mode: "insensitive" } },
      ]
    }

    const orderBy: any = {}
    if (sort === "name") orderBy.name = order
    else if (sort === "totalSpent") orderBy.totalSpent = order
    else if (sort === "totalOrders") orderBy.totalOrders = order
    else if (sort === "lastPurchaseAt") orderBy.lastPurchaseAt = order
    else orderBy.name = "asc"

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({ where, orderBy, skip, take }),
      prisma.customer.count({ where }),
    ])

    return NextResponse.json(paginatedResponse(customers, total, page, take))
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
