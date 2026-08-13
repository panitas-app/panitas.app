import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { triggerSessionEvent } from "@/lib/pusher"
import { rateLimit } from "@/lib/rate-limit"
import { verifyScannerToken } from "@/lib/scanner/session-token"

export async function POST(request: NextRequest) {
  const rl = await rateLimit("scanner-disconnect", 20, 60 * 1000)
  if (!rl.success) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta en ${Math.ceil(rl.resetIn / 1000)}s` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
    )
  }

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })

  const { sessionId, token } = body
  if (typeof sessionId !== "string" || typeof token !== "string") {
    return NextResponse.json({ error: "sessionId y token son requeridos" }, { status: 400 })
  }

  const session = await prisma.scannerSession.findUnique({ where: { id: sessionId } })
  if (!session) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
  if (!verifyScannerToken(session.token, token)) return NextResponse.json({ error: "Token inválido" }, { status: 403 })
  if (session.status !== "connected") return NextResponse.json({ error: "Sesión no está conectada" }, { status: 400 })

  await prisma.scannerSession.update({
    where: { id: sessionId },
    data: { status: "disconnected", lastActivity: new Date() },
  })

  await prisma.scannerEvent.create({
    data: { sessionId, type: "disconnected" },
  })

  await triggerSessionEvent(sessionId, "phone_disconnected", { reason: "Teléfono se desconectó" })

  return NextResponse.json({ success: true })
}
