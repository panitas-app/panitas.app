import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore, requireRole } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { createAuditEntry } from "@/lib/audit"
import { getPaginationParams, paginatedResponse } from "@/lib/pagination"
import { safeStr, safeInt } from "@/lib/validate"

export async function GET(request: NextRequest) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const { skip, take, page } = getPaginationParams(searchParams)
  const productId = searchParams.get("productId")
  const type = searchParams.get("type")
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const where: any = { storeId: current.store.id }
  if (productId) where.productId = productId
  if (type) where.type = type
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from)
    if (to) where.createdAt.lte = new Date(to)
  }

  const [items, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: { product: { select: { id: true, name: true, sku: true, images: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.stockMovement.count({ where }),
  ])

  return NextResponse.json(paginatedResponse(items, total, page, take))
}

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  const current = await requireRole(["admin", "manager"])

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })

  const type = body.type
  if (!["increase", "decrease", "adjustment"].includes(type)) return NextResponse.json({ error: "Tipo inválido" }, { status: 400 })

  const productId = safeStr(body.productId, 64)
  if (!productId) return NextResponse.json({ error: "Producto requerido" }, { status: 400 })

  const quantity = safeInt(body.quantity, 999999, 1)
  if (!quantity) return NextResponse.json({ error: "Cantidad inválida" }, { status: 400 })

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product || product.storeId !== current.store.id) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })

  let newStock: number
  if (type === "increase") {
    newStock = product.stock + quantity
  } else if (type === "decrease") {
    if (product.stock < quantity) return NextResponse.json({ error: "Stock insuficiente" }, { status: 400 })
    newStock = product.stock - quantity
  } else {
    newStock = quantity
  }

  const [movement] = await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        type,
        quantity: type === "increase" ? quantity : -quantity,
        balance: newStock,
        concept: safeStr(body.concept, 500) || null,
        reference: safeStr(body.reference, 200) || null,
        productId,
        storeId: current.store.id,
      },
    }),
    prisma.product.update({
      where: { id: productId },
      data: { stock: newStock },
    }),
  ])

  await createAuditEntry({ action: `stock.${type}`, entity: "StockMovement", entityId: movement.id, storeId: current.store.id, userId: current.userId })

  return NextResponse.json(movement, { status: 201 })
}
