import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore } from "@/lib/permissions"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const data: any = {}
  if (typeof body.isActive === "boolean") data.isActive = body.isActive
  if (body.name) data.name = String(body.name).slice(0, 100)
  if (body.config) data.config = typeof body.config === "string" ? body.config : JSON.stringify(body.config)

  const automation = await prisma.automation.updateMany({
    where: { id, storeId: current.store.id },
    data,
  })

  return NextResponse.json({ success: true })
}
