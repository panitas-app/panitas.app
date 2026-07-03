import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentNegocio } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"

const VALID_STATUSES = ["pending", "confirmed", "cancelled", "completed"] as const

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const negocio = await getCurrentNegocio()
  if (!negocio) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const appointment = await prisma.appointment.findFirst({
    where: { id, negocioId: negocio.id },
    include: { service: true },
  })
  if (!appointment) return NextResponse.json({ error: "No encontrada" }, { status: 404 })
  return NextResponse.json(appointment)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  const negocio = await getCurrentNegocio()
  if (!negocio) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params

  const appointment = await prisma.appointment.findFirst({ where: { id, negocioId: negocio.id } })
  if (!appointment) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const data: any = {}

  if (body.status && VALID_STATUSES.includes(body.status as any)) {
    data.status = body.status
  }
  if (body.notes !== undefined) data.notes = String(body.notes).slice(0, 1000)

  const updated = await prisma.appointment.update({
    where: { id },
    data,
    include: { service: true },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  const negocio = await getCurrentNegocio()
  if (!negocio) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params

  const appointment = await prisma.appointment.findFirst({ where: { id, negocioId: negocio.id } })
  if (!appointment) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

  await prisma.appointment.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
