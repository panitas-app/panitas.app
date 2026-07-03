import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { csrfGuard } from "@/lib/csrf"
import { safeStr } from "@/lib/validate"
import { PLAN_DEFINITIONS } from "@/lib/plans"

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const planId = safeStr(body.planId, 50, 1)
  const modalidad = safeStr(body.modalidad, 20) || null

  if (!planId) return NextResponse.json({ error: "planId requerido" }, { status: 400 })
  if (!PLAN_DEFINITIONS[planId as keyof typeof PLAN_DEFINITIONS]) {
    return NextResponse.json({ error: "Plan inválido" }, { status: 400 })
  }

  const planDef = PLAN_DEFINITIONS[planId as keyof typeof PLAN_DEFINITIONS]

  if (planDef.requiresSelection && !modalidad) {
    return NextResponse.json({ error: "Debes seleccionar una modalidad para el plan Básico" }, { status: 400 })
  }

  if (modalidad && !planDef.modalidades.includes(modalidad as any)) {
    return NextResponse.json({ error: `Modalidad "${modalidad}" no disponible en plan ${planDef.label}` }, { status: 400 })
  }

  const existingNegocio = await prisma.negocio.findUnique({ where: { userId: session.user.id } })
  if (existingNegocio) {
    return NextResponse.json({ error: "Ya tienes un negocio registrado" }, { status: 409 })
  }

  const planRecord = await prisma.plan.findUnique({ where: { id: planId } })
  if (!planRecord) {
    return NextResponse.json({ error: "Plan no encontrado en la base de datos" }, { status: 400 })
  }

  const nombre = session.user.name?.trim() || `Negocio de ${session.user.email || "usuario"}`
  const slugBase = nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "mi-negocio"
  const slug = `${slugBase}-${Date.now().toString(36)}`

  const negocio = await prisma.negocio.create({
    data: {
      nombre,
      slug,
      planId,
      modalidad,
      planEstado: "pendiente",
      userId: session.user.id,
    },
  })

  return NextResponse.json(negocio, { status: 201 })
}
