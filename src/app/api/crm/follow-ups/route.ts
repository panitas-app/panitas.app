import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore } from "@/lib/permissions"
import { getPaginationParams, paginatedResponse } from "@/lib/pagination"

export async function GET(request: NextRequest) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const customerId = searchParams.get("customerId")
  const { skip, take, page } = getPaginationParams(searchParams, 50)

  const where: any = { storeId: current.store.id }
  if (status) where.status = status
  if (customerId) where.customerId = customerId

  const [data, total] = await Promise.all([
    prisma.customerFollowUp.findMany({
      where,
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      skip, take,
      include: { customer: { select: { name: true, phone: true } } },
    }),
    prisma.customerFollowUp.count({ where }),
  ])

  return NextResponse.json(paginatedResponse(data, total, page, take))
}

export async function POST(request: NextRequest) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }
  if (!body.customerId) return NextResponse.json({ error: "customerId requerido" }, { status: 400 })

  const followUp = await prisma.customerFollowUp.create({
    data: {
      type: String(body.type || "call").slice(0, 20),
      status: "pending",
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      notes: body.notes ? String(body.notes).slice(0, 500) : null,
      customerId: String(body.customerId),
      storeId: current.store.id,
      assignedTo: current.userId,
    },
  })
  return NextResponse.json(followUp, { status: 201 })
}
