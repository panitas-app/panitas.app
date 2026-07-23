import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { csrfGuard } from "@/lib/csrf"

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const negocio = await prisma.negocio.findUnique({
    where: { userId: session.user.id },
    include: { plan: true },
  })

  if (!negocio) {
    return NextResponse.json({ error: "No tienes un negocio registrado" }, { status: 400 })
  }

  if (negocio.planId !== "basico") {
    return NextResponse.json({
      error: negocio.planId === "negocio"
        ? "Ya tienes el plan Negocio activo."
        : "Este upgrade no está disponible para tu plan actual.",
    }, { status: 400 })
  }

  const planDestino = await prisma.plan.findUnique({ where: { id: "negocio" } })
  if (!planDestino) {
    return NextResponse.json({ error: "Plan destino no encontrado en la base de datos" }, { status: 500 })
  }

  const modalidadAnterior = negocio.modalidad

  // Sequential (Neon HTTP doesn't support transactions)
  const updated = await prisma.negocio.update({
    where: { id: negocio.id },
    data: {
      planId: "negocio",
      modalidad: null,
      planEstado: "activo",
      planInicio: new Date(),
      planVencimiento: null,
    },
  })

  await prisma.negocioPlanHistory.create({
    data: {
      negocioId: negocio.id,
      planId: "negocio",
      planNombre: planDestino.label,
      modalidad: modalidadAnterior,
      precio: planDestino.precioUsd,
      periodo: "monthly",
      estadoAnterior: `basico_${modalidadAnterior || "ambas"}`,
      estadoNuevo: "negocio_activo",
      notas: `Upgrade de Básico (${modalidadAnterior || "sin modalidad"}) a Negocio. Se habilita el módulo ${modalidadAnterior === "tienda" ? "Agenda" : "Tienda"}.`,
    },
  })

  return NextResponse.json({
    success: true,
    negocio: {
      id: updated.id,
      planId: updated.planId,
      modalidad: updated.modalidad,
      planEstado: updated.planEstado,
    },
    mensaje: `¡Felicidades! Has mejorado al plan Negocio. Ahora tienes acceso a Tienda y Agenda.${modalidadAnterior ? ` El módulo "${modalidadAnterior === "tienda" ? "Agenda" : "Tienda"}" ya está disponible en tu dashboard.` : ""}`,
  })
}
