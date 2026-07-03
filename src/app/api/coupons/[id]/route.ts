import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(req)
  if (csrf) return csrf
  try {
    const { store } = await requireRole(["admin", "manager"])
    const { id } = await params
    const body = await req.json()

    const coupon = await prisma.coupon.findUnique({ where: { id } })
    if (!coupon || coupon.storeId !== store.id) {
      return NextResponse.json({ error: "Cupón no encontrado" }, { status: 404 })
    }

    const data: any = {}
    if (body.isActive !== undefined) data.isActive = body.isActive
    if (body.value !== undefined) data.value = parseFloat(body.value)
    if (body.minPurchase !== undefined) data.minPurchase = parseFloat(body.minPurchase)
    if (body.maxUses !== undefined) data.maxUses = parseInt(body.maxUses)
    if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null

    const updated = await prisma.coupon.update({ where: { id }, data })
    return NextResponse.json(updated)
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(req)
  if (csrf) return csrf
  try {
    const { store } = await requireRole(["admin", "manager"])
    const { id } = await params

    const coupon = await prisma.coupon.findUnique({ where: { id } })
    if (!coupon || coupon.storeId !== store.id) {
      return NextResponse.json({ error: "Cupón no encontrado" }, { status: 404 })
    }

    await prisma.coupon.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
