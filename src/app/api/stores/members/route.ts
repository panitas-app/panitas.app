import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/permissions"
import crypto from "crypto"
import { csrfGuard } from "@/lib/csrf"

export async function GET() {
  try {
    const { store } = await requireRole(["admin", "manager", "viewer"])

    const members = await prisma.storeMember.findMany({
      where: { storeId: store.id },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { createdAt: "asc" },
    })

    const invitations = await prisma.invitation.findMany({
      where: { storeId: store.id, accepted: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ members, invitations })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error interno"
    return NextResponse.json({ error: message }, { status: 403 })
  }
}

export async function POST(req: Request) {
  const csrf = csrfGuard(req)
  if (csrf) return csrf
  try {
    const { store, userId: inviterId } = await requireRole(["admin"])

    const { email, role } = await req.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 })
    }

    if (!["admin", "manager", "seller", "viewer"].includes(role)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 })
    }

    const trimmedEmail = email.trim().toLowerCase()

    const invitedUser = await prisma.user.findUnique({ where: { email: trimmedEmail } })

    if (invitedUser) {
      const existing = await prisma.storeMember.findUnique({
        where: { storeId_userId: { storeId: store.id, userId: invitedUser.id } },
      })
      if (existing) {
        return NextResponse.json({ error: "El usuario ya es miembro de la tienda" }, { status: 409 })
      }
    }

    const token = crypto.randomBytes(32).toString("hex")

    await prisma.invitation.create({
      data: {
        token,
        email: trimmedEmail,
        role,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        storeId: store.id,
        invitedBy: inviterId,
      },
    })

    const origin = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const inviteLink = `${origin}/join?token=${token}`

    return NextResponse.json({ success: true, inviteLink, email: trimmedEmail })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error interno"
    return NextResponse.json({ error: message }, { status: 403 })
  }
}
