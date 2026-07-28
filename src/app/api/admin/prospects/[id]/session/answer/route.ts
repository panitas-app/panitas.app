import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"
import { calculateTemperature, calculateScoreFromAnswers } from "@/lib/crm/scoring"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getLocalSuperadmin()
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    if (!body.sessionId || !body.questionId || body.valor === undefined) {
      return NextResponse.json(
        { error: "sessionId, questionId y valor son requeridos" },
        { status: 400 }
      )
    }

    const session = await prisma.salesSession.findUnique({ where: { id: body.sessionId } })
    if (!session) return NextResponse.json({ error: "Sesion no encontrada" }, { status: 404 })
    if (session.prospectId !== id) return NextResponse.json({ error: "Sesion no pertenece a este prospecto" }, { status: 403 })
    if (session.estado !== "en_curso") return NextResponse.json({ error: "La sesion ya fue completada" }, { status: 400 })

    const question = await prisma.salesQuestion.findUnique({ where: { id: body.questionId } })
    if (!question) return NextResponse.json({ error: "Pregunta no encontrada" }, { status: 404 })

    let answerScore = 0
    if (question.puntaje) {
      try {
        const scoringMap = JSON.parse(question.puntaje)
        for (const [key, points] of Object.entries(scoringMap)) {
          if (body.valor.toLowerCase() === key.toLowerCase()) {
            answerScore = Number(points)
            break
          }
        }
      } catch { /* no scoring */ }
    }

    const existingAnswer = await prisma.salesAnswer.findUnique({
      where: { sessionId_questionId: { sessionId: body.sessionId, questionId: body.questionId } },
    })

    if (existingAnswer) {
      await prisma.salesAnswer.update({
        where: { id: existingAnswer.id },
        data: {
          valor: body.valor,
          valorJson: body.valorJson || null,
          puntaje: answerScore,
        },
      })
    } else {
      await prisma.salesAnswer.create({
        data: {
          valor: body.valor,
          valorJson: body.valorJson || null,
          puntaje: answerScore,
          sessionId: body.sessionId,
          questionId: body.questionId,
        },
      })
    }

    const allAnswers = await prisma.salesAnswer.findMany({
      where: { sessionId: body.sessionId },
      include: { question: true },
    })

    const puntuacion = calculateScoreFromAnswers(allAnswers)
    const temperatura = calculateTemperature(puntuacion)

    await prisma.salesSession.update({
      where: { id: body.sessionId },
      data: { puntuacion, temperatura },
    })

    return NextResponse.json({ puntuacion, temperatura, answerScore })
  } catch (error) {
    console.error("[admin session answer POST]", error)
    return NextResponse.json({ error: "Error al guardar respuesta" }, { status: 500 })
  }
}
