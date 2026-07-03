import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { csrfGuard } from "@/lib/csrf"
import { slugify } from "@/lib/utils"
import { safeStr } from "@/lib/validate"


export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const negocio = await prisma.negocio.findUnique({ where: { userId: session.user.id } })
  if (!negocio) return NextResponse.json({ error: "Debes tener un plan activo primero" }, { status: 400 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const nombre = safeStr(body.nombre, 100, 1)
  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })

  const descripcion = body.descripcion !== undefined ? safeStr(body.descripcion, 500) : null
  const slug = slugify(nombre)

  const existing = await prisma.agenda.findFirst({
    where: { negocioId: negocio.id, slug },
  })
  if (existing) return NextResponse.json({ error: "Ya tienes una agenda con ese nombre" }, { status: 409 })

  const agenda = await prisma.agenda.create({
    data: {
      nombre,
      slug,
      descripcion: descripcion || null,
      negocioId: negocio.id,
    },
  })

  return NextResponse.json(agenda, { status: 201 })
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const negocio = await prisma.negocio.findUnique({ where: { userId: session.user.id } })
  if (!negocio) return NextResponse.json({ error: "No tienes un negocio activo" }, { status: 404 })

  const agendas = await prisma.agenda.findMany({
    where: { negocioId: negocio.id },
    include: { services: true },
  })

  return NextResponse.json(agendas)
}
