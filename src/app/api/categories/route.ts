import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { slugify } from "@/lib/utils"
import { requireRole } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { rateLimit } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    const csrf = csrfGuard(request)
    if (csrf) return csrf

    const rl = await rateLimit("create-category", 20, 60 * 1000)
    if (!rl.success) {
      return NextResponse.json(
        { error: `Demasiadas solicitudes. Intenta en ${Math.ceil(rl.resetIn / 1000)}s` },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
      )
    }

    const current = await requireRole(["admin", "manager"])

    const body = await request.json()
    const { name } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 })
    }

    const slug = slugify(name.trim())
    if (!slug) {
      return NextResponse.json({ error: "El nombre no genera un slug válido" }, { status: 400 })
    }

    const existing = await prisma.category.findUnique({
      where: {
        storeId_slug: {
          storeId: current.store.id,
          slug,
        },
      },
    })

    if (existing) {
      return NextResponse.json(existing)
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug,
        storeId: current.store.id,
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error: any) {
    const msg = error?.message || "Error al crear la categoría"
    console.error("Error creating category:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
