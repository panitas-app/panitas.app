import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { slugify } from "@/lib/utils"

const PLAN_IDS = ["emprendedor", "reservas", "negocio", "empresarial"] as const

async function generateUniqueSlug(base: string): Promise<string> {
  const slug = slugify(base)
  const existing = await prisma.store.findUnique({ where: { slug } })
  if (!existing) return slug
  for (let i = 1; i < 1000; i++) {
    const candidate = `${slug}-${i}`
    const taken = await prisma.store.findUnique({ where: { slug: candidate } })
    if (!taken) return candidate
  }
  return `${slug}-${Date.now()}`
}

export async function POST(request: NextRequest) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const planId = body.planId as string
  if (!PLAN_IDS.includes(planId as typeof PLAN_IDS[number])) {
    return NextResponse.json({ error: "Plan inválido" }, { status: 400 })
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : ""
  if (!name) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 })

  const whatsapp = typeof body.whatsapp === "string" ? body.whatsapp.trim().slice(0, 30) : null
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 500) : null
  const pais = typeof body.pais === "string" ? body.pais.trim().slice(0, 100) : null
  const estado = typeof body.estado === "string" ? body.estado.trim().slice(0, 100) : null
  const municipio = typeof body.municipio === "string" ? body.municipio.trim().slice(0, 100) : null
  const direccion = typeof body.direccion === "string" ? body.direccion.trim().slice(0, 500) : null

  const internalPlanId = planId === "emprendedor" || planId === "reservas" ? "basico"
    : planId === "negocio" ? "negocio"
    : "empresarial"

  const modalidad = planId === "emprendedor" ? "tienda"
    : planId === "reservas" ? "agenda"
    : null

  try {
    const slug = await generateUniqueSlug(name)

    const result = await prisma.$transaction(async (tx) => {
      const negocio = await tx.negocio.create({
        data: {
          nombre: name,
          slug,
          userId,
          planId: internalPlanId,
          modalidad,
          descripcion: description,
          pais,
          estado,
          municipio,
          direccion,
          planEstado: "pendiente",
          planVencimiento: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      })

      if (planId === "reservas" || planId === "negocio" || planId === "empresarial") {
        await tx.agenda.create({
          data: {
            nombre: name,
            slug,
            descripcion: description || `Agenda de ${name}`,
            negocioId: negocio.id,
          },
        })
      }

      if (planId === "emprendedor" || planId === "negocio" || planId === "empresarial" || planId === "reservas") {
        const existingStore = await tx.store.findUnique({ where: { userId } })
        if (!existingStore) {
          await tx.store.create({
            data: {
              name,
              slug,
              description: description || null,
              whatsapp,
              userId,
              negocioId: negocio.id,
              plan: "free",
              planType: planId === "emprendedor" ? "tienda" : planId === "negocio" ? "negocio" : planId === "empresarial" ? "empresa" : "agenda",
              planStatus: "pendiente",
            },
          })
        }
      }

      return negocio
    })

    return NextResponse.json({ success: true, negocioId: result.id })
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Ya tienes un negocio registrado" }, { status: 409 })
    }
    return NextResponse.json({ error: "Error al crear el negocio" }, { status: 500 })
  }
}
