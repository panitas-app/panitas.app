import { NextRequest, NextResponse } from "next/server"
import { getCurrentNegocio } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { AgendaService } from "@/services/agenda.service"
import { toServiceResponse, createdResponse } from "@/services/http"

const agendaService = new AgendaService()

export async function GET(request: NextRequest) {
  const negocio = await getCurrentNegocio()
  if (!negocio) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date")
  const agendaId = searchParams.get("agendaId")
  const employeeId = searchParams.get("employeeId")
  const serviceId = searchParams.get("serviceId")

  const appointments = await agendaService.list(negocio.id, { date, agendaId, employeeId, serviceId })

  return NextResponse.json(appointments)
}

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })

  try {
    const negocio = await getCurrentNegocio()
    const appointment = await agendaService.create({
      body,
      negocio: negocio ? { id: negocio.id, planId: negocio.planId, modalidad: negocio.modalidad } : null,
    })
    return createdResponse(appointment)
  } catch (err) {
    return toServiceResponse(err)
  }
}
