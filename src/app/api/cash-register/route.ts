import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")

  const where: any = { storeId: current.store.id }
  if (status === "open") where.status = "open"
  else if (status === "closed") where.status = "closed"

  const sessions = await prisma.cashRegisterSession.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return NextResponse.json(sessions)
}

export async function POST(request: NextRequest) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await request.json()

  if (body.action === "open") {
    const active = await prisma.cashRegisterSession.findFirst({
      where: { storeId: current.store.id, status: "open" },
    })
    if (active) return NextResponse.json({ error: "Ya hay una caja abierta" }, { status: 400 })

    const session = await prisma.cashRegisterSession.create({
      data: {
        storeId: current.store.id,
        openedBy: current.userId,
        openingBalance: Math.max(0, parseFloat(body.openingBalance) || 0),
      },
    })
    return NextResponse.json(session, { status: 201 })
  }

  return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
}
