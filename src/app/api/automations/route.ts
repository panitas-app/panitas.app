import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore } from "@/lib/permissions"

const DEFAULT_AUTOMATIONS = [
  { trigger: "appointment_reminder", name: "Recordatorio de cita", config: '{"offsetHours":24,"message":"Recordatorio: tienes una cita mañana a las {{time}}"}', isActive: true },
  { trigger: "post_appointment", name: "Seguimiento post cita", config: '{"offsetHours":2,"message":"¿Cómo te fue en tu cita? Cuéntanos tu experiencia"}', isActive: false },
  { trigger: "post_purchase", name: "Seguimiento post compra", config: '{"offsetHours":48,"message":"Gracias por tu compra. ¿Te gustaría dejarnos una reseña?"}', isActive: false },
  { trigger: "inactive_client", name: "Clientes inactivos", config: '{"daysInactive":90,"message":"Hace tiempo que no te vemos, vuelve con un descuento especial"}', isActive: false },
  { trigger: "custom", name: "Mensaje personalizado", config: '{"message":""}', isActive: false },
]

export async function GET() {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  let automations = await prisma.automation.findMany({
    where: { storeId: current.store.id },
    orderBy: { createdAt: "asc" },
  })

  if (automations.length === 0) {
    await prisma.automation.createMany({
      data: DEFAULT_AUTOMATIONS.map((a) => ({ ...a, storeId: current.store.id })),
    })
    automations = await prisma.automation.findMany({
      where: { storeId: current.store.id },
      orderBy: { createdAt: "asc" },
    })
  }

  return NextResponse.json(automations)
}

export async function POST(request: NextRequest) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const name = String(body.name || "Nueva automatización").slice(0, 100)
  const trigger = String(body.trigger || "custom").slice(0, 50)
  const config = typeof body.config === "string" ? body.config : JSON.stringify(body.config || {})

  const automation = await prisma.automation.create({
    data: { name, trigger, config, storeId: current.store.id },
  })

  return NextResponse.json(automation, { status: 201 })
}
