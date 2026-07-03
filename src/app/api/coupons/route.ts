import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore, requireRole } from "@/lib/permissions"
import crypto from "crypto"
import { csrfGuard } from "@/lib/csrf"
import { rateLimit } from "@/lib/rate-limit"

export async function GET() {
  try {
    const current = await getCurrentStore()
    if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const coupons = await prisma.coupon.findMany({
      where: { storeId: current.store.id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(coupons)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const csrf = csrfGuard(req)
  if (csrf) return csrf

  const rl = await rateLimit("create-coupon", 15, 60 * 1000)
  if (!rl.success) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta en ${Math.ceil(rl.resetIn / 1000)}s` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
    )
  }

  try {
    const current = await requireRole(["admin", "manager"])
    const body = await req.json()

    if (!body.code?.trim()) {
      return NextResponse.json({ error: "El código es requerido" }, { status: 400 })
    }

    const code = body.code.trim().toUpperCase().replace(/\s+/g, "")

    const existing = await prisma.coupon.findUnique({
      where: { storeId_code: { storeId: current.store.id, code } },
    })
    if (existing) {
      return NextResponse.json({ error: "Ya existe un cupón con ese código" }, { status: 409 })
    }

    if (!["percentage", "fixed"].includes(body.type)) {
      return NextResponse.json({ error: "Tipo inválido. Usa 'percentage' o 'fixed'" }, { status: 400 })
    }

    const value = parseFloat(body.value)
    if (isNaN(value) || value <= 0) {
      return NextResponse.json({ error: "El valor debe ser mayor a 0" }, { status: 400 })
    }
    if (body.type === "percentage" && value > 100) {
      return NextResponse.json({ error: "El porcentaje no puede exceder 100" }, { status: 400 })
    }

    const coupon = await prisma.coupon.create({
      data: {
        code,
        type: body.type,
        value,
        minPurchase: parseFloat(body.minPurchase || 0),
        maxUses: parseInt(body.maxUses || 0),
        startsAt: body.startsAt ? new Date(body.startsAt) : new Date(),
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        storeId: current.store.id,
      },
    })

    return NextResponse.json(coupon, { status: 201 })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
