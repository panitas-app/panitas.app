import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"
import { uploadToCloudinary } from "@/lib/cloudinary"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getLocalSuperadmin()
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params

    const prospect = await prisma.potentialClient.findUnique({ where: { id } })
    if (!prospect) return NextResponse.json({ error: "Prospecto no encontrado" }, { status: 404 })

    const files = await prisma.potentialClientFile.findMany({
      where: { prospectId: id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(files)
  } catch (error) {
    console.error("[admin prospect files GET]", error)
    return NextResponse.json({ error: "Error al cargar archivos" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getLocalSuperadmin()
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params

    const prospect = await prisma.potentialClient.findUnique({ where: { id } })
    if (!prospect) return NextResponse.json({ error: "Prospecto no encontrado" }, { status: 404 })

    const contentType = req.headers.get("content-type") || ""

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData()
      const file = formData.get("file") as File | null
      const nombre = formData.get("nombre") as string || file?.name || ""
      const tipo = formData.get("tipo") as string || file?.type || ""
      const esFoto = formData.get("esFoto") === "true"

      if (!file) {
        return NextResponse.json({ error: "Archivo requerido" }, { status: 400 })
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const url = await uploadToCloudinary(buffer, {
        folder: `prospects/${id}`,
        resourceType: "auto",
      })

      const fileRecord = await prisma.potentialClientFile.create({
        data: {
          nombre,
          url,
          tipo,
          size: file.size,
          esFoto,
          prospectId: id,
        },
      })

      return NextResponse.json(fileRecord, { status: 201 })
    }

    const body = await req.json()

    if (!body.nombre || !body.url || !body.tipo) {
      return NextResponse.json(
        { error: "nombre, url y tipo son requeridos" },
        { status: 400 }
      )
    }

    const fileRecord = await prisma.potentialClientFile.create({
      data: {
        nombre: body.nombre,
        url: body.url,
        tipo: body.tipo,
        size: body.size || null,
        esFoto: body.esFoto || false,
        prospectId: id,
      },
    })

    return NextResponse.json(fileRecord, { status: 201 })
  } catch (error) {
    console.error("[admin prospect files POST]", error)
    return NextResponse.json({ error: "Error al crear archivo" }, { status: 500 })
  }
}
