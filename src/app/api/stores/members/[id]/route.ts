import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(req)
  if (csrf) return csrf
  try {
    const { memberId: currentMemberId, store } = await requireRole(["admin"])
    const { id } = await params

    const { role } = await req.json()
    if (!["admin", "manager", "seller", "viewer"].includes(role)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 })
    }

    const target = await prisma.storeMember.findUnique({ where: { id } })
    if (!target || target.storeId !== store.id) {
      return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 })
    }

    if (target.id === currentMemberId) {
      return NextResponse.json({ error: "No puedes cambiar tu propio rol" }, { status: 400 })
    }

    const updated = await prisma.storeMember.update({
      where: { id },
      data: { role },
    })

    return NextResponse.json({ success: true, member: updated })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error interno"
    return NextResponse.json({ error: message }, { status: 403 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(req)
  if (csrf) return csrf
  try {
    const { memberId: currentMemberId, store } = await requireRole(["admin"])
    const { id } = await params

    const target = await prisma.storeMember.findUnique({ where: { id } })
    if (!target || target.storeId !== store.id) {
      return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 })
    }

    if (target.id === currentMemberId) {
      return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 })
    }

    await prisma.storeMember.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error interno"
    return NextResponse.json({ error: message }, { status: 403 })
  }
}
