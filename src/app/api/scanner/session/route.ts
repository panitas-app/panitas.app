import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/permissions"
import { rateLimit } from "@/lib/rate-limit"
import { csrfGuard } from "@/lib/csrf"
import { triggerSessionEvent } from "@/lib/pusher"
import { randomUUID } from "crypto"

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const rl = await rateLimit("scanner-create-session", 10, 60 * 1000)
  if (!rl.success) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta en ${Math.ceil(rl.resetIn / 1000)}s` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
    )
  }

  const current = await requireRole(["admin", "manager", "seller"])
  const storeId = current.store.id
  const negocioId = current.store.negocioId
  if (!negocioId) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 400 })

  const token = randomUUID()
  const session = await prisma.scannerSession.create({
    data: {
      storeId,
      negocioId,
      userId: current.userId,
      status: "pending",
      token,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  })

  await triggerSessionEvent(session.id, "session_created", {
    sessionId: session.id,
    expiresAt: session.expiresAt.toISOString(),
  })

  return NextResponse.json({
    sessionId: session.id,
    token,
    expiresAt: session.expiresAt.toISOString(),
  })
}
