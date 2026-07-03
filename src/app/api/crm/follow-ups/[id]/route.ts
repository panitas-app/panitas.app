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
  if (body.status) data.status = body.status
  if (body.status === "completed") data.completedAt = new Date()
  if (body.notes !== undefined) data.notes = String(body.notes).slice(0, 500)
  if (body.dueDate) data.dueDate = new Date(body.dueDate)

  const fu = await prisma.customerFollowUp.updateMany({
    where: { id, storeId: current.store.id },
    data,
  })
  return NextResponse.json({ success: true })
}
