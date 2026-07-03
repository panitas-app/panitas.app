import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore } from "@/lib/permissions"

export async function GET() {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const tags = await prisma.customerTag.findMany({ where: { storeId: current.store.id }, orderBy: { name: "asc" } })
  return NextResponse.json(tags)
}

export async function POST(request: NextRequest) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }
  if (!body.name) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })

  const tag = await prisma.customerTag.create({
    data: {
      name: String(body.name).slice(0, 100),
      color: String(body.color || "#6366f1").slice(0, 7),
      storeId: current.store.id,
    },
  })
  return NextResponse.json(tag, { status: 201 })
}
