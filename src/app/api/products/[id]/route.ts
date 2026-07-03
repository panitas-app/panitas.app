import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore, requireRole } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { createAuditEntry } from "@/lib/audit"
import { safeStr, requireStr, safeFloat, safeInt, safeBool, safeImages, safeStringArray, LIMITS } from "@/lib/validate"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (typeof id !== "string" || id.length > 64) return NextResponse.json({ error: "Invalid id" }, { status: 400 })
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true },
  })

  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (product.storeId !== current.store.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  return NextResponse.json(product)
}

function generateSku(name: string): string {
  const prefix = name
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 4)
  const random = Math.floor(1000 + Math.random() * 9000)
  return prefix ? `${prefix}-${random}` : `PROD-${random}`
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  const { id } = await params
  if (typeof id !== "string" || id.length > 64) return NextResponse.json({ error: "Invalid id" }, { status: 400 })
  const current = await requireRole(["admin", "manager", "seller"])

  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (product.storeId !== current.store.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })

  const data: any = {}

  if (body.name !== undefined) {
    const name = requireStr(body.name, LIMITS.MAX_NAME, 1)
    if (!name) return NextResponse.json({ error: "Nombre inválido" }, { status: 400 })
    data.name = name
  }

  if (body.description !== undefined) {
    const desc = safeStr(body.description, LIMITS.MAX_DESCRIPTION)
    if (desc === null) return NextResponse.json({ error: "Descripción inválida" }, { status: 400 })
    data.description = desc || null
  }

  if (body.price !== undefined) {
    const price = safeFloat(body.price, LIMITS.MAX_PRICE, 0)
    if (price === null) return NextResponse.json({ error: "Precio inválido" }, { status: 400 })
    data.price = price
  }

  if (body.costPrice !== undefined) {
    const cp = body.costPrice === null ? null : safeFloat(body.costPrice, LIMITS.MAX_PRICE)
    if (body.costPrice !== null && cp === null) return NextResponse.json({ error: "Costo inválido" }, { status: 400 })
    data.costPrice = cp
  }

  if (body.stock !== undefined) {
    const stock = safeInt(body.stock, LIMITS.MAX_STOCK)
    if (stock === null) return NextResponse.json({ error: "Stock inválido" }, { status: 400 })
    data.stock = stock
  }

  if (body.sku !== undefined) {
    if (typeof body.sku !== "string") return NextResponse.json({ error: "SKU inválido" }, { status: 400 })
    const sku = body.sku.trim().toUpperCase().slice(0, 32)
    data.sku = sku || generateSku(data.name || product.name)
  }

  if (body.images !== undefined) {
    const imgs = safeImages(body.images)
    if (imgs === null) return NextResponse.json({ error: "Imágenes inválidas" }, { status: 400 })
    data.images = JSON.stringify(imgs)
  }

  if (body.unidadBase !== undefined) {
    data.unidadBase = safeStr(body.unidadBase, 50) || "Unidad"
  }
  if (body.isActive !== undefined) data.isActive = safeBool(body.isActive)
  if (body.categoryId !== undefined) {
    data.categoryId = typeof body.categoryId === "string" ? body.categoryId.slice(0, 64) : null
  }

  if (body.isWholesale !== undefined) data.isWholesale = safeBool(body.isWholesale)
  if (body.wholesaleLabel !== undefined) {
    data.wholesaleLabel = typeof body.wholesaleLabel === "string" ? body.wholesaleLabel.slice(0, 100) : null
  }
  if (body.wholesalePrice !== undefined) {
    const wp = body.wholesalePrice === null ? null : safeFloat(body.wholesalePrice, LIMITS.MAX_PRICE)
    if (body.wholesalePrice !== null && wp === null) return NextResponse.json({ error: "Precio mayorista inválido" }, { status: 400 })
    data.wholesalePrice = wp
  }
  if (body.wholesaleScales !== undefined) {
    let scales: string[] | null = null
    if (body.wholesaleScales !== null) {
      let arr: unknown = body.wholesaleScales
      if (typeof arr === "string") {
        try { arr = JSON.parse(arr) } catch { return NextResponse.json({ error: "Escalas mayoristas inválidas" }, { status: 400 }) }
      }
      scales = safeStringArray(arr, LIMITS.MAX_WHOLESCALE)
      if (scales === null) return NextResponse.json({ error: "Escalas mayoristas inválidas" }, { status: 400 })
    }
    data.wholesaleScales = scales ? JSON.stringify(scales) : null
  }
  if (body.hasSizes !== undefined) data.hasSizes = safeBool(body.hasSizes)
  if (body.sizes !== undefined) {
    let sizes: string[] | null = null
    if (body.sizes !== null) {
      let arr: unknown = body.sizes
      if (typeof arr === "string") {
        try { arr = JSON.parse(arr) } catch { return NextResponse.json({ error: "Talles inválidos" }, { status: 400 }) }
      }
      sizes = safeStringArray(arr, LIMITS.MAX_SIZES)
      if (sizes === null) return NextResponse.json({ error: "Talles inválidos" }, { status: 400 })
    }
    data.sizes = sizes ? JSON.stringify(sizes) : null
  }

  const updated = await prisma.product.update({
    where: { id },
    data,
    include: { category: true },
  })

  await createAuditEntry({ action: "product.updated", entity: "Product", entityId: id, storeId: current.store.id, userId: current.userId })

  return NextResponse.json(updated)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  const { id } = await params
  if (typeof id !== "string" || id.length > 64) return NextResponse.json({ error: "Invalid id" }, { status: 400 })
  const current = await requireRole(["admin"])

  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (product.storeId !== current.store.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  await prisma.product.delete({ where: { id } })

  await createAuditEntry({ action: "product.deleted", entity: "Product", entityId: id, storeId: current.store.id, userId: current.userId })

  return NextResponse.json({ success: true })
}
