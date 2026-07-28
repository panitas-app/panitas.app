import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"
import { createAuditEntry } from "@/lib/audit"

export async function POST(req: NextRequest) {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  if (!body.texto?.trim()) {
    return NextResponse.json({ error: "El texto es requerido" }, { status: 400 })
  }
  if (!body.sectionId?.trim()) {
    return NextResponse.json({ error: "El sectionId es requerido" }, { status: 400 })
  }

  const section = await prisma.salesSection.findUnique({ where: { id: body.sectionId } })
  if (!section) {
    return NextResponse.json({ error: "Sección no encontrada" }, { status: 404 })
  }

  const question = await prisma.salesQuestion.create({
    data: {
      texto: body.texto.trim(),
      subtexto: body.subtexto ?? undefined,
      tipo: body.tipo ?? "radio",
      opciones: body.opciones ?? undefined,
      orden: body.orden ?? 0,
      requerida: body.requerida ?? true,
      puntaje: body.puntaje ?? undefined,
      condicionLogica: body.condicionLogica ?? undefined,
      categoria: body.categoria ?? undefined,
      placeholder: body.placeholder ?? undefined,
      maxChars: body.maxChars ?? undefined,
      activo: body.activo ?? true,
      sectionId: body.sectionId,
    },
  })

  await createAuditEntry({
    action: "sales_question.created",
    entity: "SalesQuestion",
    entityId: question.id,
    userId: admin.id,
    metadata: { texto: question.texto, sectionId: question.sectionId },
  })

  return NextResponse.json(question, { status: 201 })
}
