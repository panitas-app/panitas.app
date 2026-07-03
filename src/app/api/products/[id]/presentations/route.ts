import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore, requireRole } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { safeStr, safeInt } from "@/lib/validate"

async function getProduct(id: string, storeId: string) {
  if (typeof id !== "string" || id.length > 64) return null
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product || product.storeId !== storeId) return null
  return product
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const product = await getProduct(id, current.store.id)
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const presentations = await prisma.productPresentation.findMany({
    where: { productId: id },
    orderBy: { multiplier: "asc" },
  })

  return NextResponse.json(presentations)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  const { id } = await params
  const current = await requireRole(["admin", "manager"])
  const product = await getProduct(id, current.store.id)
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const label = safeStr(body.label, 50)
  if (!label) return NextResponse.json({ error: "Nombre de presentación requerido" }, { status: 400 })
  const multiplier = safeInt(body.multiplier, 999999, 1)
  if (!multiplier) return NextResponse.json({ error: "Multiplicador inválido (mín 1)" }, { status: 400 })

  const existing = await prisma.productPresentation.findUnique({
    where: { productId_label: { productId: id, label } },
  })
  if (existing) return NextResponse.json({ error: "Ya existe una presentación con ese nombre" }, { status: 409 })

  const presentation = await prisma.productPresentation.create({
    data: { label, multiplier, productId: id },
  })

  return NextResponse.json(presentation, { status: 201 })
}
