import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore, requireRole } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { getPaginationParams, paginatedResponse } from "@/lib/pagination"

export async function GET(request: NextRequest) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const { skip, take, page } = getPaginationParams(searchParams)
  const sellerId = searchParams.get("sellerId")
  const status = searchParams.get("status")
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const where: any = {
    seller: { storeId: current.store.id },
  }
  if (sellerId) where.sellerId = sellerId
  if (status) where.status = status
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from)
    if (to) where.createdAt.lte = new Date(to)
  }

  const [items, total] = await Promise.all([
    prisma.sellerCommission.findMany({
      where,
      include: {
        seller: { select: { id: true, name: true, photo: true } },
        order: { select: { id: true, orderNumber: true, total: true, createdAt: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.sellerCommission.count({ where }),
  ])

  return NextResponse.json(paginatedResponse(items, total, page, take))
}

export async function PATCH(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  const current = await requireRole(["admin", "manager"])

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const id = body.id
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

  const commission = await prisma.sellerCommission.findUnique({
    where: { id },
    include: { seller: true },
  })
  if (!commission || commission.seller.storeId !== current.store.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const updated = await prisma.sellerCommission.update({
    where: { id },
    data: {
      status: body.status === "paid" ? "paid" : body.status === "cancelled" ? "cancelled" : commission.status,
      paidAt: body.status === "paid" ? new Date() : body.status === "cancelled" ? null : undefined,
    },
  })

  return NextResponse.json(updated)
}
