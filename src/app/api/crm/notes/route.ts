import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { getPaginationParams, paginatedResponse } from "@/lib/pagination"

export async function GET(request: NextRequest) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const customerId = searchParams.get("customerId")
  const { skip, take, page } = getPaginationParams(searchParams, 50)

  const where: any = { storeId: current.store.id }
  if (customerId) where.customerId = customerId

  const [data, total] = await Promise.all([
    prisma.customerNote.findMany({
      where, orderBy: { createdAt: "desc" }, skip, take,
    }),
    prisma.customerNote.count({ where }),
  ])

  return NextResponse.json(paginatedResponse(data, total, page, take))
}

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }
  if (!body.content || !body.customerId) return NextResponse.json({ error: "content y customerId requeridos" }, { status: 400 })

  const note = await prisma.customerNote.create({
    data: {
      content: String(body.content).slice(0, 2000),
      customerId: String(body.customerId),
      storeId: current.store.id,
      createdBy: current.userId,
    },
  })
  return NextResponse.json(note, { status: 201 })
}
