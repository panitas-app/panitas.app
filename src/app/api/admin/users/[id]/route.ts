import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"
import { createAuditEntry } from "@/lib/audit"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, image: true, role: true, emailVerified: true,
      createdAt: true, updatedAt: true, suspendedAt: true, suspensionReason: true,
      store: {
        select: {
          id: true, name: true, slug: true, plan: true, planType: true, planStatus: true,
          isActive: true, createdAt: true,
          _count: { select: { products: true, orders: true, members: true } },
        },
      },
      negocio: { select: { id: true, nombre: true, planId: true, modalidad: true, planEstado: true, planVencimiento: true } },
      _count: { select: { orders: true } },
    },
  })

  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })

  const subscriptions = await prisma.storeSubscription.findMany({
    where: { store: { userId: id } },
    orderBy: { createdAt: "desc" },
    select: { id: true, plan: true, status: true, amount: true, period: true, createdAt: true, verifiedAt: true, rejectionReason: true },
  })

  const auditLogs = await prisma.auditLog.findMany({
    where: { userId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  return NextResponse.json({ ...user, subscriptions, auditLogs })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const user = await prisma.user.update({
    where: { id },
    data: {
      name: body.name ?? undefined,
      email: body.email ?? undefined,
      role: body.role ?? undefined,
    },
  })

  await createAuditEntry({
    action: "user.updated",
    entity: "User",
    entityId: id,
    userId: admin.id,
    metadata: { changes: Object.keys(body) },
  })

  return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role })
}
