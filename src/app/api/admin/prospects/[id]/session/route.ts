import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"
import { seedSalesData } from "@/lib/crm/seed-data"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getLocalSuperadmin()
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const { searchParams } = new URL(req.url)
    const route = searchParams.get("route") || undefined

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

    const sessionRoute = route || activeSession?.routeSeleccionada || undefined

    const sectionWhere: Record<string, unknown> = { activo: true }
    if (sessionRoute) {
      sectionWhere.route = sessionRoute
    }

    let sections = await prisma.salesSection.findMany({
      where: sectionWhere,
      include: {
        questions: {
          where: { activo: true },
          orderBy: { orden: "asc" },
        },
      },
      orderBy: { orden: "asc" },
    })

    if (sections.length === 0) {
      await seedSalesData(prisma)
      sections = await prisma.salesSection.findMany({
        where: sectionWhere,
        include: {
          questions: {
            where: { activo: true },
            orderBy: { orden: "asc" },
          },
        },
        orderBy: { orden: "asc" },
      })
    }

    const completedSessions = await prisma.salesSession.findMany({
      where: { prospectId: id, estado: "completada" },
      select: {
        id: true,
        completadaAt: true,
        puntuacion: true,
        temperatura: true,
        planRecomendado: true,
        planSeleccionado: true,
        routeSeleccionada: true,
        resumen: true,
        createdAt: true,
      },
      orderBy: { completadaAt: "desc" },
    })

    return NextResponse.json({ session: activeSession, sections, completedSessions })
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

    const body = await req.json().catch(() => ({}))
    const routeSeleccionada = body.routeSeleccionada || null

    const sectionWhere: Record<string, unknown> = { activo: true }
    if (routeSeleccionada) {
      sectionWhere.route = routeSeleccionada
    }

    let firstSection = await prisma.salesSection.findFirst({
      where: sectionWhere,
      orderBy: { orden: "asc" },
    })

    if (!firstSection) {
      await seedSalesData(prisma)
      firstSection = await prisma.salesSection.findFirst({
        where: sectionWhere,
        orderBy: { orden: "asc" },
      })
    }

    const session = await prisma.salesSession.create({
      data: {
        prospectId: id,
        adminId: admin.id,
        sectionId: firstSection?.id || null,
        planSeleccionado: body.planSeleccionado || null,
        routeSeleccionada,
      },
    })

    let sections = await prisma.salesSection.findMany({
      where: sectionWhere,
      include: {
        questions: {
          where: { activo: true },
          orderBy: { orden: "asc" },
        },
      },
      orderBy: { orden: "asc" },
    })

    if (sections.length === 0) {
      await seedSalesData(prisma)
      sections = await prisma.salesSection.findMany({
        where: sectionWhere,
        include: {
          questions: {
            where: { activo: true },
            orderBy: { orden: "asc" },
          },
        },
        orderBy: { orden: "asc" },
      })
    }

    return NextResponse.json({ session: { ...session, answers: [] }, sections }, { status: 201 })
  } catch (error) {
    console.error("[admin session POST]", error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `Error al crear sesion: ${msg}` }, { status: 500 })
  }
}
