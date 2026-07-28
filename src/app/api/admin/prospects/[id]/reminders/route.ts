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

    const reminders = await prisma.potentialClientReminder.findMany({
      where: { prospectId: id },
      orderBy: { fecha: "asc" },
    })

    return NextResponse.json(reminders)
  } catch (error) {
    console.error("[admin prospect reminders GET]", error)
    return NextResponse.json({ error: "Error al cargar recordatorios" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getLocalSuperadmin()
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    if (!body.titulo || !body.fecha) {
      return NextResponse.json(
        { error: "titulo y fecha son requeridos" },
        { status: 400 }
      )
    }

    const prospect = await prisma.potentialClient.findUnique({ where: { id } })
    if (!prospect) return NextResponse.json({ error: "Prospecto no encontrado" }, { status: 404 })

    const reminder = await prisma.potentialClientReminder.create({
      data: {
        titulo: body.titulo,
        descripcion: body.descripcion || null,
        fecha: new Date(body.fecha),
        prospectId: id,
      },
    })

    return NextResponse.json(reminder, { status: 201 })
  } catch (error) {
    console.error("[admin prospect reminders POST]", error)
    return NextResponse.json({ error: "Error al crear recordatorio" }, { status: 500 })
  }
}
