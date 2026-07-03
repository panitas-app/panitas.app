import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const store = await prisma.store.findUnique({ where: { userId: session.user.id } })
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 })
  const employees = await prisma.employee.findMany({
    where: { storeId: store.id },
    include: { branch: { select: { id: true, name: true } }, services: { include: { service: { select: { id: true, name: true } } } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(employees)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const store = await prisma.store.findUnique({ where: { userId: session.user.id } })
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 })
  const body = await req.json()
  const employee = await prisma.employee.create({
    data: {
      name: body.name,
      email: body.email,
      phone: body.phone,
      photo: body.photo,
      position: body.position,
      publicSlug: body.publicSlug,
      remunerationType: body.remunerationType,
      commissionDefault: body.commissionDefault ? Number(body.commissionDefault) : null,
      salary: body.salary ? Number(body.salary) : null,
      rentalAmount: body.rentalAmount ? Number(body.rentalAmount) : null,
      mixedSalary: body.mixedSalary ? Number(body.mixedSalary) : null,
      mixedCommission: body.mixedCommission ? Number(body.mixedCommission) : null,
      branchId: body.branchId,
      storeId: store.id,
    },
    include: { branch: { select: { id: true, name: true } } },
  })
  return NextResponse.json(employee, { status: 201 })
}
