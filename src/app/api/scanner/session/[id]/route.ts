import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { triggerSessionEvent } from "@/lib/pusher"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (typeof id !== "string" || id.length > 64) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  const current = await requireRole(["admin", "manager", "seller"])

  const session = await prisma.scannerSession.findUnique({
    where: { id },
    include: { events: { orderBy: { createdAt: "desc" }, take: 50 } },
  })

  if (!session) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
  if (session.storeId !== current.store.id) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  return NextResponse.json(session)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const { id } = await params
  if (typeof id !== "string" || id.length > 64) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  const current = await requireRole(["admin", "manager", "seller"])

  const session = await prisma.scannerSession.findUnique({ where: { id } })
  if (!session) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
  if (session.storeId !== current.store.id) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  await prisma.scannerSession.update({
    where: { id },
    data: { status: "disconnected" },
  })

  await triggerSessionEvent(id, "scanner_disconnect", { reason: "Usuario canceló la sesión" })

  return NextResponse.json({ success: true })
}
