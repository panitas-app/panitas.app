import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore, requireRole } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { createAuditEntry } from "@/lib/audit"
import { safeStr, safeFloat } from "@/lib/validate"
import bcrypt from "bcryptjs"

export async function GET(request: NextRequest) {
  try {
    const current = await getCurrentStore()
    if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q") || ""
    const isActive = searchParams.get("isActive")

    const where: any = { storeId: current.store.id }
    if (q) where.name = { contains: q, mode: "insensitive" }
    if (isActive === "true") where.isActive = true
    else if (isActive === "false") where.isActive = false

    const items = await prisma.seller.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, username: true, email: true, phone: true, photo: true, documentId: true, isActive: true, commissionType: true, commissionValue: true },
    })

    return NextResponse.json(items)
  } catch (error: any) {
    console.error("Error fetching sellers:", error)
    return NextResponse.json({ error: "Error al cargar vendedores" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const csrf = csrfGuard(request)
    if (csrf) return csrf
    const current = await requireRole(["admin", "manager"])

    let body: any
    try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })

    const name = safeStr(body.name, 100)
    if (!name) return NextResponse.json({ error: "Nombre inválido" }, { status: 400 })

    const username = safeStr(body.username, 50)
    if (!username) return NextResponse.json({ error: "Usuario requerido" }, { status: 400 })

    const password = String(body.password || "")
    if (!password || password.length < 4) return NextResponse.json({ error: "Contraseña debe tener al menos 4 caracteres" }, { status: 400 })

    const seller = await prisma.seller.create({
      data: {
        name,
        username,
        passwordHash: await bcrypt.hash(password, 10),
        email: safeStr(body.email, 200) || null,
        phone: safeStr(body.phone, 30) || null,
        photo: safeStr(body.photo, 500) || null,
        documentId: safeStr(body.documentId, 30) || null,
        commissionType: body.commissionType === "percentage" || body.commissionType === "fixed" ? body.commissionType : null,
        commissionValue: safeFloat(body.commissionValue, 999999, 0) ?? null,
        storeId: current.store.id,
      },
    })

    await createAuditEntry({ action: "seller.created", entity: "Seller", entityId: seller.id, storeId: current.store.id, userId: current.userId })

    return NextResponse.json({ success: true, seller }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating seller:", error)
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "El nombre de usuario ya existe" }, { status: 409 })
    }
    return NextResponse.json({ error: error?.message || "Error al crear vendedor" }, { status: 500 })
  }
}
