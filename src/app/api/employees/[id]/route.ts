import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const store = await prisma.store.findUnique({ where: { userId: session.user.id } })
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 })
  const employee = await prisma.employee.findFirst({
    where: { id, storeId: store.id },
    include: {
      branch: { select: { id: true, name: true } },
      services: { include: { service: { select: { id: true, name: true, price: true, durationMin: true } } } },
      schedules: true,
    },
  })
  if (!employee) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json(employee)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const store = await prisma.store.findUnique({ where: { userId: session.user.id } })
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 })
  const body = await req.json()
  const employee = await prisma.employee.updateMany({
    where: { id, storeId: store.id },
    data: {
      name: body.name,
      email: body.email,
      phone: body.phone,
      photo: body.photo,
      position: body.position,
      isActive: body.isActive,
      publicSlug: body.publicSlug,
      remunerationType: body.remunerationType,
      commissionDefault: body.commissionDefault !== undefined ? Number(body.commissionDefault) : undefined,
      salary: body.salary !== undefined ? Number(body.salary) : undefined,
      rentalAmount: body.rentalAmount !== undefined ? Number(body.rentalAmount) : undefined,
      mixedSalary: body.mixedSalary !== undefined ? Number(body.mixedSalary) : undefined,
      mixedCommission: body.mixedCommission !== undefined ? Number(body.mixedCommission) : undefined,
      branchId: body.branchId,
    },
  })
  if (employee.count === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const store = await prisma.store.findUnique({ where: { userId: session.user.id } })
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 })
  await prisma.employee.deleteMany({ where: { id, storeId: store.id } })
  return NextResponse.json({ success: true })
}
