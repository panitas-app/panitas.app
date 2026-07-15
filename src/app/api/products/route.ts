import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore, requireRole } from "@/lib/permissions"
import { getPaginationParams, paginatedResponse } from "@/lib/pagination"
import { safeStr, requireStr, safeFloat, safeInt, safeBool, safeImages, safeStringArray, LIMITS } from "@/lib/validate"

export async function GET(request: NextRequest) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const { skip, take, page } = getPaginationParams(searchParams)
  const q = (searchParams.get("q") || "").slice(0, 100)
  const category = searchParams.get("category") || ""

  const where: any = { storeId: current.store.id }
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
    ]
  }
  if (category) where.categoryId = category

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.product.count({ where }),
  ])

  return NextResponse.json(paginatedResponse(products, total, page, take))
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

import { PLAN_LIMITS } from "@/lib/constants"
import { csrfGuard } from "@/lib/csrf"
import { createAuditEntry } from "@/lib/audit"
import { rateLimit } from "@/lib/rate-limit"
import { getPostHogClient } from "@/lib/posthog-server"

export async function POST(request: NextRequest) {
  try {
    const csrf = csrfGuard(request)
    if (csrf) return csrf

    const rl = await rateLimit("create-product", 30, 60 * 1000)
    if (!rl.success) {
      return NextResponse.json(
        { error: `Demasiadas solicitudes. Intenta en ${Math.ceil(rl.resetIn / 1000)}s` },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
      )
    }

    const current = await requireRole(["admin", "manager", "seller"])

    const storePlan = (current.store.plan || "free") as keyof typeof PLAN_LIMITS
    const limit = PLAN_LIMITS[storePlan]?.products ?? 30

    if (limit !== -1) {
      const existingCount = await prisma.product.count({ where: { storeId: current.store.id } })
      if (existingCount >= limit) {
        return NextResponse.json(
          { error: `Has alcanzado el límite de ${limit} productos para tu plan actual (${storePlan.toUpperCase()}). Por favor, actualiza tu plan en Configuración.` },
          { status: 403 }
        )
      }
    }

    let body: any
    try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })

    const name = requireStr(body.name, LIMITS.MAX_NAME, 1)
    if (!name) return NextResponse.json({ error: "Nombre inválido o demasiado largo" }, { status: 400 })

    const price = safeFloat(body.price, LIMITS.MAX_PRICE, 0)
    if (price === null) return NextResponse.json({ error: "Precio inválido" }, { status: 400 })

    const description = body.description !== undefined ? safeStr(body.description, LIMITS.MAX_DESCRIPTION) : null
    if (body.description !== undefined && description === null) return NextResponse.json({ error: "Descripción inválida" }, { status: 400 })

    const costPrice = body.costPrice !== undefined ? safeFloat(body.costPrice, LIMITS.MAX_PRICE) : null
    if (body.costPrice !== undefined && costPrice === null) return NextResponse.json({ error: "Costo inválido" }, { status: 400 })

    const stock = body.stock !== undefined ? safeInt(body.stock, LIMITS.MAX_STOCK) : 0
    if (body.stock !== undefined && stock === null) return NextResponse.json({ error: "Stock inválido" }, { status: 400 })

    const images = body.images !== undefined ? safeImages(body.images) : []
    if (body.images !== undefined && images === null) return NextResponse.json({ error: "Imágenes inválidas" }, { status: 400 })

    const skuInput = typeof body.sku === "string" ? body.sku.trim().toUpperCase().slice(0, 32) : ""
    const finalSku = skuInput || generateSku(name)

  const isWholesale = safeBool(body.isWholesale)
  const wholesaleLabel = isWholesale && typeof body.wholesaleLabel === "string" ? body.wholesaleLabel.slice(0, 100) : null
  const wholesalePrice = isWholesale && body.wholesalePrice !== undefined ? safeFloat(body.wholesalePrice, LIMITS.MAX_PRICE) : null
  const wholesaleScales = isWholesale && body.wholesaleScales !== undefined ? (() => {
    const raw = body.wholesaleScales
    if (typeof raw === "string") {
      try { return JSON.parse(raw) } catch { return null }
    }
    if (!Array.isArray(raw) || raw.length > LIMITS.MAX_WHOLESCALE) return null
    for (const item of raw) {
      if (typeof item !== "object" || item === null) return null
      if (typeof item.quantity !== "number" || typeof item.price !== "number") return null
      if (item.quantity < 0 || item.price < 0) return null
    }
    return raw
  })() : null
  if (isWholesale && body.wholesaleScales !== undefined && wholesaleScales === null) {
    return NextResponse.json({ error: "Escalas mayoristas inválidas" }, { status: 400 })
  }

  const hasSizes = safeBool(body.hasSizes)
  const sizes = hasSizes && body.sizes !== undefined ? (() => {
    if (typeof body.sizes === "string") {
      try { return JSON.parse(body.sizes) } catch { return null }
    }
    if (!Array.isArray(body.sizes) || body.sizes.length > LIMITS.MAX_SIZES) return null
    for (const item of body.sizes) {
      if (typeof item !== "object" || item === null) return null
      if (typeof item.size !== "string" || !item.size.trim()) return null
      if (item.stock !== null && typeof item.stock !== "number") return null
    }
    return body.sizes
  })() : null
  if (hasSizes && body.sizes !== undefined && sizes === null) {
    return NextResponse.json({ error: "Talles inválidos" }, { status: 400 })
  }

    const unidadBase = safeStr(body.unidadBase, 50) || "Unidad"

    const product = await prisma.product.create({
      data: {
        name,
        description: description || null,
        price: price!,
        costPrice,
        sku: finalSku,
        stock: stock ?? 0,
        unidadBase,
        images: JSON.stringify(images || []),
        isActive: body.isActive !== false,
        categoryId: typeof body.categoryId === "string" ? body.categoryId.slice(0, 64) : null,
        isWholesale,
        wholesaleLabel,
        wholesalePrice,
        wholesaleScales: wholesaleScales ? JSON.stringify(wholesaleScales) : null,
        hasSizes,
        sizes: sizes ? JSON.stringify(sizes) : null,
        storeId: current.store.id,
      },
      include: { category: true },
    })

    await createAuditEntry({ action: "product.created", entity: "Product", entityId: product.id, storeId: current.store.id, userId: current.userId })

    const posthog = getPostHogClient()
    posthog.capture({
      distinctId: current.userId,
      event: "product_created",
      properties: {
        store_id: current.store.id,
        store_plan: current.store.plan,
        has_category: !!product.categoryId,
        is_wholesale: product.isWholesale,
        has_sizes: product.hasSizes,
        price: product.price,
      },
    })
    await posthog.flush()

    return NextResponse.json(product, { status: 201 })
  } catch (err) {
    console.error("[Product Create Error]", err)
    const message = err instanceof Error ? err.message : "Error desconocido"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
