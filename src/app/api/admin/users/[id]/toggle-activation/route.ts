import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin, validateAdminSecret } from "@/lib/local-only"
import { createAuditEntry } from "@/lib/audit"
import { csrfGuard } from "@/lib/csrf"
import { resolvePlanId, getPlanPrice } from "@/lib/plans"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(req)
  if (csrf) return csrf

  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  let body: { active?: unknown; secret?: unknown; includeRevenue?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 }) }

  const secret = typeof body.secret === "string" ? body.secret : ""
  if (!secret || !validateAdminSecret(secret)) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 })
  }

  const active = body.active === true
  const includeRevenue = body.includeRevenue === true

  const user = await prisma.user.findUnique({
    where: { id },
    include: { store: true, negocio: true },
  })
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })

  if (user.store) {
    await prisma.store.update({
      where: { id: user.store.id },
      data: { planStatus: active ? "activo" : "pendiente" },
    })

    if (active && includeRevenue && user.store) {
      const planId = resolvePlanId(user.store.planType)
      const amount = getPlanPrice(planId, "monthly")
      const now = new Date()
      const endDate = new Date(now)
      endDate.setMonth(endDate.getMonth() + 1)
      await prisma.storeSubscription.create({
        data: {
          plan: planId,
          status: "active",
          amount,
          period: "monthly",
          startDate: now,
          endDate,
          storeId: user.store.id,
          notes: "Activación manual por admin con registro de ganancias",
        },
      })
    }
  }

  if (user.negocio) {
    await prisma.negocio.update({
      where: { id: user.negocio.id },
      data: {
        planEstado: active ? "activo" : "cancelado",
        ...(active ? {} : { planVencimiento: null }),
      },
    })
  }

  await createAuditEntry({
    action: active ? "plan.activated_free" : "plan.deactivated",
    entity: "User",
    entityId: id,
    userId: admin.id,
    metadata: {
      storeId: user.store?.id,
      negocioId: user.negocio?.id,
      plan: user.store?.plan || user.negocio?.planId,
      includeRevenue: active ? includeRevenue : undefined,
    },
  })

  return NextResponse.json({ success: true, active, includeRevenue: active ? includeRevenue : false })
}
