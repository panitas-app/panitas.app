import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentNegocio } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  const negocio = await getCurrentNegocio()
  if (!negocio) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const block = await prisma.blockedSlot.findFirst({ where: { id, negocioId: negocio.id } })
  if (!block) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  await prisma.blockedSlot.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
