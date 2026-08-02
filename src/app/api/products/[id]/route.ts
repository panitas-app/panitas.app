import { NextRequest, NextResponse } from "next/server"
import { getCurrentStore, requireRole } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { ProductService } from "@/services/product.service"
import { toServiceResponse } from "@/services/http"
import type { StoreServiceContext } from "@/services/context"

const productService = new ProductService()

function ctxFrom(current: Awaited<ReturnType<typeof getCurrentStore>>): StoreServiceContext {
  return {
    storeId: current!.store.id,
    userId: current!.userId,
    plan: current!.store.plan,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (typeof id !== "string" || id.length > 64) return NextResponse.json({ error: "Invalid id" }, { status: 400 })
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const product = await productService.getById(ctxFrom(current), id)
    return NextResponse.json(product)
  } catch (err) {
    return toServiceResponse(err)
  }
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

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })

  try {
    const updated = await productService.update(ctxFrom(current), id, body)
    return NextResponse.json(updated)
  } catch (err) {
    return toServiceResponse(err)
  }
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

  try {
    const result = await productService.remove(ctxFrom(current), id)
    return NextResponse.json(result)
  } catch (err) {
    return toServiceResponse(err)
  }
}
