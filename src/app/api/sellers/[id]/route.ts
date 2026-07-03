import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore, requireRole } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { createAuditEntry } from "@/lib/audit"
import { safeStr, safeFloat } from "@/lib/validate"
import bcrypt from "bcryptjs"

async function getSeller(id: string, storeId: string) {
  if (typeof id !== "string" || id.length > 64) return null
  const seller = await prisma.seller.findUnique({ where: { id } })
  if (!seller || seller.storeId !== storeId) return null
  return seller
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const seller = await getSeller(id, current.store.id)
  if (!seller) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(seller)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  const { id } = await params
  const current = await requireRole(["admin", "manager"])
  const seller = await getSeller(id, current.store.id)
  if (!seller) return NextResponse.json({ error: "Not found" }, { status: 404 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const data: any = {}
  if (body.name !== undefined) {
    const name = safeStr(body.name, 100)
    if (!name) return NextResponse.json({ error: "Nombre inválido" }, { status: 400 })
    data.name = name
  }
  if (body.username !== undefined) {
    const username = safeStr(body.username, 50)
    if (!username) return NextResponse.json({ error: "Usuario inválido" }, { status: 400 })
    // Check uniqueness within store
    const existing = await prisma.seller.findFirst({
      where: { storeId: current.store.id, username, NOT: { id } },
    })
    if (existing) return NextResponse.json({ error: "El nombre de usuario ya existe" }, { status: 409 })
    data.username = username
  }
  if (body.email !== undefined) data.email = safeStr(body.email, 200) || null
  if (body.phone !== undefined) data.phone = safeStr(body.phone, 30) || null
  if (body.photo !== undefined) data.photo = safeStr(body.photo, 500) || null
  if (body.documentId !== undefined) data.documentId = safeStr(body.documentId, 30) || null
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive)
  if (body.commissionType !== undefined) {
    data.commissionType = body.commissionType === "percentage" || body.commissionType === "fixed" ? body.commissionType : null
  }
  if (body.commissionValue !== undefined) data.commissionValue = safeFloat(body.commissionValue, 999999, 0) ?? null
  if (body.password) {
    const password = String(body.password)
    if (password.length < 4) return NextResponse.json({ error: "Contraseña debe tener al menos 4 caracteres" }, { status: 400 })
    data.passwordHash = await bcrypt.hash(password, 10)
  }

  const updated = await prisma.seller.update({ where: { id }, data })

  await createAuditEntry({ action: "seller.updated", entity: "Seller", entityId: id, storeId: current.store.id, userId: current.userId })

  return NextResponse.json(updated)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  const { id } = await params
  const current = await requireRole(["admin"])
  const seller = await getSeller(id, current.store.id)
  if (!seller) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.seller.delete({ where: { id } })

  await createAuditEntry({ action: "seller.deleted", entity: "Seller", entityId: id, storeId: current.store.id, userId: current.userId })

  return NextResponse.json({ success: true })
}
