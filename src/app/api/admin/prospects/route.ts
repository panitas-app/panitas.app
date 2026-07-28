import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"
import { createAuditEntry } from "@/lib/audit"
import { getPaginationParams, paginatedResponse } from "@/lib/pagination"

export async function GET(req: NextRequest) {
  try {
    const admin = await getLocalSuperadmin()
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const { skip, take, page } = getPaginationParams(searchParams)
    const search = searchParams.get("search") || ""
    const estadoProspecto = searchParams.get("estadoProspecto") || ""
    const categoria = searchParams.get("categoria") || ""
    const ciudad = searchParams.get("ciudad") || ""

    const where: any = {}
    if (search) {
      where.OR = [
        { nombreNegocio: { contains: search, mode: "insensitive" } },
        { propietario: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ]
    }
    if (estadoProspecto) where.estadoProspecto = estadoProspecto
    if (categoria) where.categoria = categoria
    if (ciudad) where.ciudad = ciudad

    const [data, total] = await Promise.all([
      prisma.potentialClient.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          _count: { select: { activities: true, files: true, reminders: true, sessions: true } },
        },
      }),
      prisma.potentialClient.count({ where }),
    ])

    return NextResponse.json(paginatedResponse(data, total, page, take))
  } catch (error) {
    console.error("[admin prospects GET]", error)
    return NextResponse.json({ error: "Error al cargar prospectos" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getLocalSuperadmin()
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const body = await req.json()

    if (!body.nombreNegocio || !body.propietario) {
      return NextResponse.json(
        { error: "nombreNegocio y propietario son requeridos" },
        { status: 400 }
      )
    }

    const prospect = await prisma.potentialClient.create({
      data: {
        nombreNegocio: body.nombreNegocio,
        propietario: body.propietario,
        telefono: body.telefono || null,
        whatsapp: body.whatsapp || null,
        email: body.email || null,
        instagram: body.instagram || null,
        facebook: body.facebook || null,
        paginaWeb: body.paginaWeb || null,
        ciudad: body.ciudad || null,
        estado: body.estado || null,
        pais: body.pais || "Venezuela",
        direccion: body.direccion || null,
        categoria: body.categoria || "",
        estadoProspecto: body.estadoProspecto || "nuevo",
        puntuacion: body.puntuacion || 0,
        temperatura: body.temperatura || "frio",
        lat: body.lat || null,
        lng: body.lng || null,
        notas: body.notas || null,
      },
    })

    try {
      await createAuditEntry({
        action: "prospect.created",
        entity: "PotentialClient",
        entityId: prospect.id,
        userId: admin.id,
        metadata: { nombreNegocio: prospect.nombreNegocio, propietario: prospect.propietario },
      })
    } catch (auditErr) {
      console.error("[admin prospects POST] audit failed (non-blocking)", auditErr)
    }

    return NextResponse.json(prospect, { status: 201 })
  } catch (error) {
    console.error("[admin prospects POST]", error)
    const msg =
      process.env.NODE_ENV === "development"
        ? `Error al crear prospecto: ${error instanceof Error ? error.message : String(error)}`
        : "Error al crear prospecto"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
