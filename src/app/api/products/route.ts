import { NextRequest, NextResponse } from "next/server"
import { getCurrentStore, requireRole } from "@/lib/permissions"
import { getPaginationParams, paginatedResponse } from "@/lib/pagination"
import { csrfGuard } from "@/lib/csrf"
import { rateLimit } from "@/lib/rate-limit"
import { ProductService } from "@/services/product.service"
import { toServiceResponse, createdResponse } from "@/services/http"
import type { StoreServiceContext } from "@/services/context"

const productService = new ProductService()

export async function GET(request: NextRequest) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const { skip, take, page } = getPaginationParams(searchParams)
  const q = (searchParams.get("q") || "").slice(0, 100)
  const category = searchParams.get("category") || ""

  const { products, total } = await productService.list(
    { storeId: current.store.id, userId: current.userId },
    { q, category, skip, take }
  )

  return NextResponse.json(paginatedResponse(products, total, page, take))
}

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

    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
    }
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })

    const ctx: StoreServiceContext = {
      storeId: current.store.id,
      userId: current.userId,
      plan: current.store.plan,
    }

    const product = await productService.create(ctx, body)
    return createdResponse(product)
  } catch (err) {
    return toServiceResponse(err)
  }
}
