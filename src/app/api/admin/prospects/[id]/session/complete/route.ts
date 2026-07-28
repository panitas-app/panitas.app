import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"
import { createAuditEntry } from "@/lib/audit"
import {
  calculateTemperature,
  calculateScoreFromAnswers,
  recommendPlan,
  generateSummary,
  mapTemperatureToStatus,
} from "@/lib/crm/scoring"

function getEndOfWeek(): Date {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? 6 : 6 - day
  const end = new Date(now)
  end.setDate(now.getDate() + diff)
  end.setHours(23, 59, 59, 999)
  return end
}

function getEndOfMonth(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getLocalSuperadmin()
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    if (!body.sessionId) {
      return NextResponse.json({ error: "sessionId es requerido" }, { status: 400 })
    }

    const session = await prisma.salesSession.findUnique({
      where: { id: body.sessionId },
      include: {
        answers: {
          include: { question: true },
          orderBy: { createdAt: "asc" },
        },
      },
    })
    if (!session) return NextResponse.json({ error: "Sesion no encontrada" }, { status: 404 })
    if (session.prospectId !== id) return NextResponse.json({ error: "Sesion no pertenece a este prospecto" }, { status: 403 })
    if (session.estado !== "en_curso") return NextResponse.json({ error: "La sesion ya fue completada" }, { status: 400 })

    const prospect = await prisma.potentialClient.findUnique({ where: { id } })

    const puntuacion = calculateScoreFromAnswers(session.answers)
    const temperatura = calculateTemperature(puntuacion)
    const planRecomendado = session.planSeleccionado || recommendPlan(session.answers, puntuacion)
    const resumen = generateSummary(session.answers, planRecomendado, prospect, session.routeSeleccionada)

    const completedSession = await prisma.salesSession.update({
      where: { id: body.sessionId },
      data: {
        estado: "completada",
        completadaAt: new Date(),
        puntuacion,
        temperatura,
        planRecomendado,
        resumen,
      },
    })

    const prospectStatus = mapTemperatureToStatus(temperatura)
    const prospectUpdate: Record<string, unknown> = {
      puntuacion,
      temperatura,
      estadoProspecto: prospectStatus,
    }

    if (body.prospectData) {
      const pd = body.prospectData
      if (pd.nombreNegocio) prospectUpdate.nombreNegocio = pd.nombreNegocio
      if (pd.propietario) prospectUpdate.propietario = pd.propietario
      if (pd.telefono !== undefined) prospectUpdate.telefono = pd.telefono || null
      if (pd.whatsapp !== undefined) prospectUpdate.whatsapp = pd.whatsapp || null
      if (pd.email !== undefined) prospectUpdate.email = pd.email || null
      if (pd.instagram !== undefined) prospectUpdate.instagram = pd.instagram || null
      if (pd.facebook !== undefined) prospectUpdate.facebook = pd.facebook || null
      if (pd.paginaWeb !== undefined) prospectUpdate.paginaWeb = pd.paginaWeb || null
      if (pd.ciudad !== undefined) prospectUpdate.ciudad = pd.ciudad || null
      if (pd.estado !== undefined) prospectUpdate.estado = pd.estado || null
      if (pd.pais !== undefined) prospectUpdate.pais = pd.pais || null
      if (pd.direccion !== undefined) prospectUpdate.direccion = pd.direccion || null
      if (pd.categoria) prospectUpdate.categoria = pd.categoria
      if (pd.notas !== undefined) prospectUpdate.notas = pd.notas || null
    }

    await prisma.potentialClient.update({
      where: { id },
      data: prospectUpdate,
    })

    const tempLabel =
      temperatura === "muy_caliente" ? "Muy caliente" :
      temperatura === "caliente" ? "Caliente" :
      temperatura === "tibio" ? "Tibio" : "Frio"

    await prisma.potentialClientActivity.create({
      data: {
        tipo: "seguimiento",
        titulo: `Visita completada - ${tempLabel}`,
        descripcion: resumen,
        adminId: admin.id,
        prospectId: id,
      },
    })

    try {
      await createAuditEntry({
        action: "session.completed",
        entity: "SalesSession",
        entityId: body.sessionId,
        userId: admin.id,
        metadata: { prospectId: id, puntuacion, temperatura, planRecomendado },
      })
    } catch (auditErr) {
      console.error("[admin session complete POST] audit failed (non-blocking)", auditErr)
    }

    const noDecisionAnswer = session.answers.find(
      (a) => a.valor.toLowerCase() === "no puede tomar decisiones"
    )
    if (noDecisionAnswer) {
      const responsableAnswer = session.answers.find(
        (a) => a.question.texto.toLowerCase().includes("nombre del responsable")
      )
      if (responsableAnswer?.valor) {
        await prisma.potentialClientReminder.create({
          data: {
            titulo: `Seguimiento con responsable: ${responsableAnswer.valor}`,
            descripcion: `El prospecto indico que no puede tomar decisiones. Contactar a ${responsableAnswer.valor}.`,
            fecha: new Date(),
            prospectId: id,
          },
        })
      }
    }

    const cuandoImplAnswer = session.answers.find(
      (a) => a.question.texto.toLowerCase().includes("implementarla")
    )
    if (cuandoImplAnswer) {
      const valor = cuandoImplAnswer.valor.toLowerCase()
      let reminderDate: Date

      if (valor.includes("hoy")) {
        reminderDate = new Date()
      } else if (valor.includes("esta semana")) {
        reminderDate = getEndOfWeek()
      } else if (valor.includes("este mes")) {
        reminderDate = getEndOfMonth()
      } else {
        reminderDate = new Date()
      }

      await prisma.potentialClientReminder.create({
        data: {
          titulo: `Seguimiento de implementacion: ${cuandoImplAnswer.valor}`,
          descripcion: `El prospecto indico que podria implementar: ${cuandoImplAnswer.valor}`,
          fecha: reminderDate,
          prospectId: id,
        },
      })
    }

    return NextResponse.json(completedSession)
  } catch (error) {
    console.error("[admin session complete POST]", error)
    return NextResponse.json({ error: "Error al completar sesion" }, { status: 500 })
  }
}
