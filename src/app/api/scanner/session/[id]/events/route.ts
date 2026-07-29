import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/permissions"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (typeof id !== "string" || id.length > 64) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  const current = await requireRole(["admin", "manager", "seller"])

  const session = await prisma.scannerSession.findUnique({ where: { id }, select: { storeId: true } })
  if (!session) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
  if (session.storeId !== current.store.id) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const events = await prisma.scannerEvent.findMany({
    where: { sessionId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return NextResponse.json(events)
}
