import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"
import { createAuditEntry } from "@/lib/audit"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; reminderId: string }> }
) {
  try {
    const admin = await getLocalSuperadmin()
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id, reminderId } = await params
    const body = await req.json()

    const reminder = await prisma.potentialClientReminder.findUnique({
      where: { id: reminderId },
    })

    if (!reminder || reminder.prospectId !== id) {
      return NextResponse.json({ error: "Recordatorio no encontrado" }, { status: 404 })
    }

    const updated = await prisma.potentialClientReminder.update({
      where: { id: reminderId },
      data: {
        titulo: body.titulo ?? undefined,
        descripcion: body.descripcion ?? undefined,
        fecha: body.fecha ? new Date(body.fecha) : undefined,
        completado: body.completado ?? undefined,
      },
    })

    await createAuditEntry({
      action: "prospect.reminder.updated",
      entity: "PotentialClientReminder",
      entityId: reminderId,
      userId: admin.id,
      metadata: { prospectId: id, changes: Object.keys(body) },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[admin prospect reminder PUT]", error)
    return NextResponse.json({ error: "Error al actualizar recordatorio" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; reminderId: string }> }
) {
  try {
    const admin = await getLocalSuperadmin()
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id, reminderId } = await params

    const reminder = await prisma.potentialClientReminder.findUnique({
      where: { id: reminderId },
    })

    if (!reminder || reminder.prospectId !== id) {
      return NextResponse.json({ error: "Recordatorio no encontrado" }, { status: 404 })
    }

    await prisma.potentialClientReminder.delete({ where: { id: reminderId } })

    await createAuditEntry({
      action: "prospect.reminder.deleted",
      entity: "PotentialClientReminder",
      entityId: reminderId,
      userId: admin.id,
      metadata: { prospectId: id, titulo: reminder.titulo },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[admin prospect reminder DELETE]", error)
    return NextResponse.json({ error: "Error al eliminar recordatorio" }, { status: 500 })
  }
}
