import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { csrfGuard } from "@/lib/csrf"
import { enviarMiembroAceptado } from "@/lib/email"

export async function POST(req: Request) {
  const csrf = csrfGuard(req)
  if (csrf) return csrf
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 })
    }

    const { token } = await req.json()
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 })
    }

    const invitation = await prisma.invitation.findUnique({ where: { token } })
    if (!invitation) {
      return NextResponse.json({ error: "Invitación no encontrada o ya fue usada" }, { status: 404 })
    }

    if (invitation.accepted) {
      return NextResponse.json({ error: "Esta invitación ya fue aceptada" }, { status: 400 })
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: "Esta invitación ha expirado" }, { status: 400 })
    }

    const userEmail = session.user.email?.toLowerCase()
    if (!userEmail || userEmail !== invitation.email.toLowerCase()) {
      return NextResponse.json({
        error: `Esta invitación es para ${invitation.email}. Debes iniciar sesión con esa cuenta.`,
      }, { status: 403 })
    }

    const existing = await prisma.storeMember.findUnique({
      where: { storeId_userId: { storeId: invitation.storeId, userId: session.user.id } },
    })
    if (existing) {
      return NextResponse.json({ error: "Ya eres miembro de esta tienda" }, { status: 409 })
    }

    await prisma.$transaction([
      prisma.storeMember.create({
        data: {
          storeId: invitation.storeId,
          userId: session.user.id,
          role: invitation.role,
        },
      }),
      prisma.invitation.update({
        where: { id: invitation.id },
        data: { accepted: true, acceptedBy: session.user.id },
      }),
    ])

    const store = await prisma.store.findUnique({
      where: { id: invitation.storeId },
      select: { name: true, slug: true },
    })

    // Notify admin that invitation was accepted
    if (invitation.invitedBy) {
      const admin = await prisma.user.findUnique({ where: { id: invitation.invitedBy }, select: { email: true } })
      const newMember = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true } })
      if (admin?.email && newMember) {
        enviarMiembroAceptado(admin.email, {
          tiendaNombre: store?.name || "Tu tienda",
          nombreMiembro: newMember.name || "Nuevo miembro",
          emailMiembro: newMember.email || "",
          rol: invitation.role,
        }).catch(e => console.error("[team email] accepted error:", e))
      }
    }

    return NextResponse.json({ success: true, store })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
