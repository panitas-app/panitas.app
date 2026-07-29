import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { triggerSessionEvent } from "@/lib/pusher"
import { rateLimit } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  const rl = await rateLimit("scanner-scan", 60, 60 * 1000)
  if (!rl.success) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta en ${Math.ceil(rl.resetIn / 1000)}s` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
    )
  }

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })

  const { sessionId, barcode } = body
  if (typeof sessionId !== "string" || typeof barcode !== "string" || !barcode.trim()) {
    return NextResponse.json({ error: "sessionId y barcode son requeridos" }, { status: 400 })
  }

  const session = await prisma.scannerSession.findUnique({ where: { id: sessionId } })
  if (!session) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
  if (session.status !== "connected") return NextResponse.json({ error: "Sesión no está conectada" }, { status: 400 })
  if (new Date() > session.expiresAt) {
    await prisma.scannerSession.update({ where: { id: sessionId }, data: { status: "expired" } })
    return NextResponse.json({ error: "Sesión expirada" }, { status: 410 })
  }

  await prisma.scannerSession.update({
    where: { id: sessionId },
    data: { lastActivity: new Date() },
  })

  await prisma.scannerEvent.create({
    data: { sessionId, type: "barcode_scanned", payload: JSON.stringify({ barcode: barcode.trim() }) },
  })

  await triggerSessionEvent(sessionId, "barcode_scanned", { barcode: barcode.trim() })

  return NextResponse.json({ success: true })
}
