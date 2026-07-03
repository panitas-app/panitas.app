import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"
import { createAuditEntry } from "@/lib/audit"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params

  const store = await prisma.store.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { products: true, orders: true, members: true, customers: true, coupons: true } },
    },
  })

  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 })

  const revenue = await prisma.order.aggregate({
    where: { storeId: id },
    _sum: { total: true },
  })

  const recentOrders = await prisma.order.findMany({
    where: { storeId: id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, orderNumber: true, total: true, status: true, createdAt: true, customerName: true },
  })

  const subscriptions = await prisma.storeSubscription.findMany({
    where: { storeId: id },
    orderBy: { createdAt: "desc" },
    select: { id: true, plan: true, status: true, amount: true, createdAt: true },
  })

  const auditLogs = await prisma.auditLog.findMany({
    where: { storeId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  const topProducts = await prisma.orderItem.groupBy({
    by: ["productName"],
    where: { order: { storeId: id } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 10,
  })

  return NextResponse.json({
    ...store,
    totalRevenue: revenue._sum.total || 0,
    recentOrders,
    subscriptions,
    auditLogs,
    topProducts: topProducts.map(p => ({ name: p.productName, quantity: p._sum.quantity || 0 })),
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const updateData: any = {}
  if (body.name) updateData.name = body.name
  if (body.isActive !== undefined) updateData.isActive = body.isActive
  if (body.planType) updateData.planType = body.planType
  if (body.template) updateData.template = body.template

  const store = await prisma.store.update({
    where: { id },
    data: updateData,
  })

  await createAuditEntry({
    action: "store.updated",
    entity: "Store",
    entityId: id,
    userId: admin.id,
    storeId: id,
    metadata: { changes: Object.keys(body) },
  })

  return NextResponse.json(store)
}
