import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { csrfGuard } from "@/lib/csrf"
import { getPostHogClient } from "@/lib/posthog-server"

export async function POST(req: Request) {
  const csrf = csrfGuard(req)
  if (csrf) return csrf
  try {
    const body = await req.json()
    const { code, storeSlug, subtotal } = body

    if (!code || !storeSlug) {
      return NextResponse.json({ error: "Código y tienda requeridos" }, { status: 400 })
    }

    const store = await prisma.store.findUnique({ where: { slug: storeSlug } })
    if (!store) {
      return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 })
    }

    const coupon = await prisma.coupon.findUnique({
      where: { storeId_code: { storeId: store.id, code: code.trim().toUpperCase() } },
    })

    if (!coupon) {
      return NextResponse.json({ error: "Cupón no encontrado" }, { status: 404 })
    }

    if (!coupon.isActive) {
      return NextResponse.json({ error: "Este cupón ya no está activo" }, { status: 400 })
    }

    if (coupon.startsAt > new Date()) {
      return NextResponse.json({ error: "Este cupón aún no está disponible" }, { status: 400 })
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return NextResponse.json({ error: "Este cupón ha expirado" }, { status: 400 })
    }

    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ error: "Este cupón ya no tiene usos disponibles" }, { status: 400 })
    }

    const orderSubtotal = parseFloat(subtotal || 0)
    if (coupon.minPurchase > 0 && orderSubtotal < coupon.minPurchase) {
      return NextResponse.json({
        error: `Compra mínima de $${coupon.minPurchase.toFixed(2)} para usar este cupón`,
      }, { status: 400 })
    }

    let discount = 0
    if (coupon.type === "percentage") {
      discount = orderSubtotal * (coupon.value / 100)
    } else {
      discount = coupon.value
    }

    if (discount > orderSubtotal) discount = orderSubtotal

    const posthog = getPostHogClient()
    posthog.capture({
      distinctId: store.id,
      event: "coupon_validated",
      properties: {
        coupon_type: coupon.type,
        coupon_value: coupon.value,
        discount: Math.round(discount * 100) / 100,
        store_id: store.id,
      },
    })
    await posthog.flush()

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
      },
      discount: Math.round(discount * 100) / 100,
    })
  } catch {
    return NextResponse.json({ error: "Error al validar cupón" }, { status: 500 })
  }
}
