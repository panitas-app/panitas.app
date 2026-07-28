import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getLocalSuperadmin()
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params

    const prospect = await prisma.potentialClient.findUnique({ where: { id } })
    if (!prospect) return NextResponse.json({ error: "Prospecto no encontrado" }, { status: 404 })

    const activities = await prisma.potentialClientActivity.findMany({
      where: { prospectId: id },
      orderBy: { fecha: "desc" },
    })

    return NextResponse.json(activities)
  } catch (error) {
    console.error("[admin prospect activities GET]", error)
    return NextResponse.json({ error: "Error al cargar actividades" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getLocalSuperadmin()
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    if (!body.tipo || !body.titulo) {
      return NextResponse.json(
        { error: "tipo y titulo son requeridos" },
        { status: 400 }
      )
    }

    const prospect = await prisma.potentialClient.findUnique({ where: { id } })
    if (!prospect) return NextResponse.json({ error: "Prospecto no encontrado" }, { status: 404 })

    const activity = await prisma.potentialClientActivity.create({
      data: {
        tipo: body.tipo,
        titulo: body.titulo,
        descripcion: body.descripcion || null,
        fecha: body.fecha ? new Date(body.fecha) : new Date(),
        duracionMin: body.duracionMin || null,
        fechaProx: body.fechaProx ? new Date(body.fechaProx) : null,
        completado: body.completado || false,
        adminId: admin.id,
        prospectId: id,
      },
    })

    return NextResponse.json(activity, { status: 201 })
  } catch (error) {
    console.error("[admin prospect activities POST]", error)
    return NextResponse.json({ error: "Error al crear actividad" }, { status: 500 })
  }
}
