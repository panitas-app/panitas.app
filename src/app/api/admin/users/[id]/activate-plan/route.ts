import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin, validateAdminSecret } from "@/lib/local-only"
import { createAuditEntry } from "@/lib/audit"
import { csrfGuard } from "@/lib/csrf"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(req)
  if (csrf) return csrf

  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  let body: { secret?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 }) }

  const secret = typeof body.secret === "string" ? body.secret : ""
  if (!secret || !validateAdminSecret(secret)) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: { store: true, negocio: true },
  })
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })

  if (user.store) {
    await prisma.store.update({
      where: { id: user.store.id },
      data: { planStatus: "activo" },
    })
  }

  if (user.negocio) {
    await prisma.negocio.update({
      where: { id: user.negocio.id },
      data: { planEstado: "activo" },
    })
  }

  await createAuditEntry({
    action: "plan.activated_free",
    entity: "User",
    entityId: id,
    userId: admin.id,
    metadata: {
      storeId: user.store?.id,
      negocioId: user.negocio?.id,
      plan: user.store?.plan || user.negocio?.planId,
    },
  })

  return NextResponse.json({ success: true, message: "Plan activado correctamente" })
}
