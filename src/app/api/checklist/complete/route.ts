import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const { itemId } = body

  if (!itemId) return NextResponse.json({ error: "itemId requerido" }, { status: 400 })

  const store = await prisma.store.findUnique({ where: { userId: session.user.id } })
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 })

  // Auto-detect based on action, no manual override needed
  // Items are detected by the GET endpoint based on store state
  return NextResponse.json({ success: true })
}
