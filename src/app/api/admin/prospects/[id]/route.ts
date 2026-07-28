import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"
import { createAuditEntry } from "@/lib/audit"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getLocalSuperadmin()
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params

    const prospect = await prisma.potentialClient.findUnique({
      where: { id },
      include: {
        activities: { orderBy: { fecha: "desc" } },
        files: { orderBy: { createdAt: "desc" } },
        reminders: { orderBy: { fecha: "asc" } },
        _count: { select: { activities: true, files: true, reminders: true, sessions: true } },
      },
    })

    if (!prospect) return NextResponse.json({ error: "Prospecto no encontrado" }, { status: 404 })

    return NextResponse.json(prospect)
  } catch (error) {
    console.error("[admin prospect GET]", error)
    return NextResponse.json({ error: "Error al cargar prospecto" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getLocalSuperadmin()
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    const prospect = await prisma.potentialClient.findUnique({ where: { id } })
    if (!prospect) return NextResponse.json({ error: "Prospecto no encontrado" }, { status: 404 })

    const updated = await prisma.potentialClient.update({
      where: { id },
      data: {
        nombreNegocio: body.nombreNegocio ?? undefined,
        propietario: body.propietario ?? undefined,
        telefono: body.telefono ?? undefined,
        whatsapp: body.whatsapp ?? undefined,
        email: body.email ?? undefined,
        instagram: body.instagram ?? undefined,
        facebook: body.facebook ?? undefined,
        paginaWeb: body.paginaWeb ?? undefined,
        ciudad: body.ciudad ?? undefined,
        estado: body.estado ?? undefined,
        pais: body.pais ?? undefined,
        direccion: body.direccion ?? undefined,
        categoria: body.categoria ?? undefined,
        lat: body.lat ?? undefined,
        lng: body.lng ?? undefined,
        estadoProspecto: body.estadoProspecto ?? undefined,
        puntuacion: body.puntuacion ?? undefined,
        temperatura: body.temperatura ?? undefined,
        notas: body.notas ?? undefined,
      },
    })

    await createAuditEntry({
      action: "prospect.updated",
      entity: "PotentialClient",
      entityId: id,
      userId: admin.id,
      metadata: { changes: Object.keys(body) },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[admin prospect PUT]", error)
    return NextResponse.json({ error: "Error al actualizar prospecto" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getLocalSuperadmin()
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params

    const prospect = await prisma.potentialClient.findUnique({ where: { id } })
    if (!prospect) return NextResponse.json({ error: "Prospecto no encontrado" }, { status: 404 })

    await prisma.potentialClient.delete({ where: { id } })

    await createAuditEntry({
      action: "prospect.deleted",
      entity: "PotentialClient",
      entityId: id,
      userId: admin.id,
      metadata: { nombreNegocio: prospect.nombreNegocio },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[admin prospect DELETE]", error)
    return NextResponse.json({ error: "Error al eliminar prospecto" }, { status: 500 })
  }
}
