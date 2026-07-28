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

    const sessions = await prisma.salesSession.findMany({
      where: { prospectId: id, estado: "completada" },
      select: {
        id: true,
        completadaAt: true,
        puntuacion: true,
        temperatura: true,
        planRecomendado: true,
        resumen: true,
        createdAt: true,
      },
      orderBy: { completadaAt: "desc" },
    })

    return NextResponse.json(sessions)
  } catch (error) {
    console.error("[admin session history GET]", error)
    return NextResponse.json({ error: "Error al cargar historial" }, { status: 500 })
  }
}
