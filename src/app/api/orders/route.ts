import { NextRequest, NextResponse } from "next/server"
import { getCurrentStore, requireRole } from "@/lib/permissions"
import { getPaginationParams, paginatedResponse } from "@/lib/pagination"
import { csrfGuard } from "@/lib/csrf"
import { rateLimit } from "@/lib/rate-limit"
import { OrderService } from "@/services/order.service"
import { toServiceResponse } from "@/services/http"
import type { StoreServiceContext } from "@/services/context"

const orderService = new OrderService()

function ctxFrom(current: Awaited<ReturnType<typeof getCurrentStore>>): StoreServiceContext {
  return {
    storeId: current!.store.id,
    userId: current!.userId,
    plan: current!.store.plan,
    storeName: current!.store.name,
    storeEmail: current!.store.email,
  }
}

export async function GET(request: NextRequest) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const { skip, take, page } = getPaginationParams(searchParams)
  const status = searchParams.get("status")

  const { orders, total } = await orderService.list(ctxFrom(current), { status, skip, take })

  return NextResponse.json(paginatedResponse(orders, total, page, take))
}

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const rl = await rateLimit("create-order", 20, 60 * 1000)
  if (!rl.success) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta en ${Math.ceil(rl.resetIn / 1000)}s` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
    )
  }

  try {
    const current = await requireRole(["admin", "manager", "seller"])
    const body = await request.json()

    const order = await orderService.create(ctxFrom(current), body)
    return NextResponse.json(order, { status: 201 })
  } catch (error: any) {
    if (error?.message?.includes("No tienes")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error?.code === "P2003") {
      return NextResponse.json(
        { error: "Error de integridad: uno de los productos o la tienda no existe. Intenta vaciar el carrito y agregar los productos de nuevo." },
        { status: 400 }
      )
    }
    return toServiceResponse(error)
  }
}
