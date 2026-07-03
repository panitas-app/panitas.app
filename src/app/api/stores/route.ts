import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { slugify } from "@/lib/utils"
import { getCurrentStore, requireRole } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { safeStr, safeColor, safePlan, safeUrl, LIMITS } from "@/lib/validate"
import bcrypt from "bcryptjs"

export async function GET() {
  const storeInfo = await getCurrentStore()
  if (!storeInfo) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const store = await prisma.store.findUnique({
    where: { id: storeInfo.store.id },
    include: {
      categories: true,
      paymentAccounts: true,
      products: true,
    },
  })

  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 })

  return NextResponse.json(store)
}

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const existing = await prisma.store.findUnique({ where: { userId: session.user.id } })
  if (existing) return NextResponse.json({ error: "Store already exists" }, { status: 409 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })

  const name = safeStr(body.name, LIMITS.MAX_NAME, 1)
  if (!name) return NextResponse.json({ error: "Nombre inválido" }, { status: 400 })

  const slug = body.slug ? safeStr(body.slug, 100) : slugify(name)
  if (!slug) return NextResponse.json({ error: "Slug inválido" }, { status: 400 })

  const description = body.description !== undefined ? safeStr(body.description, LIMITS.MAX_DESCRIPTION) : null
  if (body.description !== undefined && description === null) return NextResponse.json({ error: "Descripción inválida" }, { status: 400 })

  const whatsapp = body.whatsapp !== undefined ? safeStr(body.whatsapp, 30) : null
  const phone = body.phone !== undefined ? safeStr(body.phone, 30) : null
  const address = body.address !== undefined ? safeStr(body.address, 500) : null
  const logo = body.logo !== undefined ? safeUrl(body.logo) : null
  const banner = body.banner !== undefined ? safeUrl(body.banner) : null
  const primaryColor = body.primaryColor !== undefined ? safeColor(body.primaryColor) : null
  if (body.primaryColor !== undefined && primaryColor === null) return NextResponse.json({ error: "Color inválido" }, { status: 400 })
  const plan = safePlan(body.plan)

  // Find user's negocio to link the store
  const negocio = await prisma.negocio.findUnique({ where: { userId: session.user.id } })

  const store = await prisma.store.create({
    data: {
      name,
      slug: slugify(slug),
      description: description || null,
      whatsapp: whatsapp || null,
      phone: phone || null,
      address: address || null,
      logo: logo || null,
      primaryColor: primaryColor || "#2563eb",
      banner: banner || null,
      plan,
      userId: session.user.id,
      negocioId: negocio?.id || null,
    },
  })

  return NextResponse.json(store, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  let storeInfo
  try {
    storeInfo = await requireRole(["admin"])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 })
  }

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })

  const data: any = {}

  if (body.name !== undefined) {
    const name = safeStr(body.name, LIMITS.MAX_NAME, 1)
    if (!name) return NextResponse.json({ error: "Nombre inválido" }, { status: 400 })
    data.name = name
    data.slug = slugify(name)
  }

  if (body.description !== undefined) {
    const d = safeStr(body.description, LIMITS.MAX_DESCRIPTION)
    if (d === null) return NextResponse.json({ error: "Descripción inválida" }, { status: 400 })
    data.description = d || null
  }
  if (body.logo !== undefined) {
    const v = body.logo ? safeUrl(body.logo) : null
    if (body.logo && !v) return NextResponse.json({ error: "Logo inválido" }, { status: 400 })
    data.logo = v
  }
  if (body.banner !== undefined) {
    const v = body.banner ? safeUrl(body.banner) : null
    if (body.banner && !v) return NextResponse.json({ error: "Banner inválido" }, { status: 400 })
    data.banner = v
  }
  if (body.primaryColor !== undefined) {
    const c = safeColor(body.primaryColor)
    if (!c) return NextResponse.json({ error: "Color inválido" }, { status: 400 })
    data.primaryColor = c
  }
  if (body.whatsapp !== undefined) {
    const v = body.whatsapp ? safeStr(body.whatsapp, 30) : null
    if (body.whatsapp && !v) return NextResponse.json({ error: "WhatsApp inválido" }, { status: 400 })
    data.whatsapp = v
  }
  if (body.email !== undefined) {
    const v = body.email ? safeStr(body.email, 254) : null
    if (body.email && (typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 })
    }
    data.email = v
  }
  if (body.phone !== undefined) {
    const v = body.phone ? safeStr(body.phone, 30) : null
    if (body.phone && !v) return NextResponse.json({ error: "Teléfono inválido" }, { status: 400 })
    data.phone = v
  }
  if (body.address !== undefined) {
    const v = body.address ? safeStr(body.address, 500) : null
    if (body.address && !v) return NextResponse.json({ error: "Dirección inválida" }, { status: 400 })
    data.address = v
  }
  if (body.domain !== undefined) {
    const v = body.domain ? safeStr(body.domain, 253) : null
    if (body.domain && v) {
      // Domain: only allow simple hostname format
      if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(v.toLowerCase())) {
        return NextResponse.json({ error: "Dominio inválido" }, { status: 400 })
      }
    }
    data.domain = v
  }

  const socialFields = ["instagram", "facebook", "tiktok", "twitter", "youtube", "linkedin"] as const
  for (const field of socialFields) {
    if (body[field] !== undefined) {
      const v = body[field] ? safeUrl(body[field]) : null
      if (body[field] && !v) return NextResponse.json({ error: `${field} inválido` }, { status: 400 })
      data[field] = v
    }
  }

  if (body.storeHours !== undefined) {
    const v = body.storeHours ? safeStr(body.storeHours, 1000) : null
    if (body.storeHours && !v) return NextResponse.json({ error: "Horario inválido" }, { status: 400 })
    data.storeHours = v
  }
  if (body.shippingCost !== undefined) {
    if (body.shippingCost === null) {
      data.shippingCost = null
    } else {
      const n = Number(body.shippingCost)
      if (!Number.isFinite(n) || n < 0 || n > LIMITS.MAX_PRICE) {
        return NextResponse.json({ error: "Costo de envío inválido" }, { status: 400 })
      }
      data.shippingCost = n
    }
  }
  if (body.freeShippingActive !== undefined) data.freeShippingActive = body.freeShippingActive === true
  if (body.freeShippingMinAmount !== undefined) {
    if (body.freeShippingMinAmount === null) {
      data.freeShippingMinAmount = null
    } else {
      const n = Number(body.freeShippingMinAmount)
      if (!Number.isFinite(n) || n < 0 || n > LIMITS.MAX_PRICE) {
        return NextResponse.json({ error: "Monto mínimo inválido" }, { status: 400 })
      }
      data.freeShippingMinAmount = n
    }
  }

  if (body.posPin !== undefined) {
    if (body.posPin === null || body.posPin === "") {
      data.posPin = null
    } else {
      const pin = String(body.posPin)
      if (pin.length < 4 || pin.length > 6) return NextResponse.json({ error: "PIN inválido (4-6 dígitos)" }, { status: 400 })
      data.posPin = await bcrypt.hash(pin, 10)
    }
  }

  const updated = await prisma.store.update({
    where: { id: storeInfo.store.id },
    data,
  })

  return NextResponse.json(updated)
}
