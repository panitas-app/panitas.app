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

    const activeSession = await prisma.salesSession.findFirst({
      where: { prospectId: id, estado: "en_curso" },
      include: {
        answers: {
          include: { question: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const sections = await prisma.salesSection.findMany({
      where: { activo: true },
      include: {
        questions: {
          where: { activo: true },
          orderBy: { orden: "asc" },
        },
      },
      orderBy: { orden: "asc" },
    })

    return NextResponse.json({ session: activeSession, sections })
  } catch (error) {
    console.error("[admin session GET]", error)
    return NextResponse.json({ error: "Error al cargar sesion" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getLocalSuperadmin()
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params

    const prospect = await prisma.potentialClient.findUnique({ where: { id } })
    if (!prospect) return NextResponse.json({ error: "Prospecto no encontrado" }, { status: 404 })

    const existingSession = await prisma.salesSession.findFirst({
      where: { prospectId: id, estado: "en_curso" },
    })
    if (existingSession) {
      return NextResponse.json({ error: "Ya existe una sesion activa para este prospecto" }, { status: 400 })
    }

    const firstSection = await prisma.salesSection.findFirst({
      where: { activo: true },
      orderBy: { orden: "asc" },
    })

    const session = await prisma.salesSession.create({
      data: {
        prospectId: id,
        adminId: admin.id,
        sectionId: firstSection?.id || null,
      },
      include: {
        answers: {
          include: { question: true },
        },
      },
    })

    const sections = await prisma.salesSection.findMany({
      where: { activo: true },
      include: {
        questions: {
          where: { activo: true },
          orderBy: { orden: "asc" },
        },
      },
      orderBy: { orden: "asc" },
    })

    return NextResponse.json({ session, sections }, { status: 201 })
  } catch (error) {
    console.error("[admin session POST]", error)
    return NextResponse.json({ error: "Error al crear sesion" }, { status: 500 })
  }
}
