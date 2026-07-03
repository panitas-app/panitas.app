import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getEffectiveRate } from "@/lib/bcv"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; employeeSlug: string }> }
) {
  const { slug, employeeSlug } = await params

  const store = await prisma.store.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      banner: true,
      description: true,
      primaryColor: true,
      whatsapp: true,
      phone: true,
      address: true,
      storeHours: true,
      negocioId: true,
    },
  })

  if (!store || !store.negocioId) {
    return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 })
  }

  const employee = await prisma.employee.findFirst({
    where: { publicSlug: employeeSlug, storeId: store.id, isActive: true },
    include: {
      services: {
        include: {
          service: { select: { id: true, name: true, description: true, image: true, price: true, durationMin: true } },
        },
      },
      schedules: true,
    },
  })

  if (!employee) {
    return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 })
  }

  const services = employee.services.map((es) => es.service)

  const paymentAccounts = await prisma.paymentAccount.findMany({
    where: { storeId: store.id, isActive: true },
  })

  return NextResponse.json({
    employee: {
      id: employee.id,
      name: employee.name,
      photo: employee.photo,
      position: employee.position,
      phone: employee.phone,
      email: employee.email,
    },
    schedules: employee.schedules,
    services,
    store: {
      id: store.id,
      name: store.name,
      slug: store.slug,
      logo: store.logo,
      banner: store.banner,
      description: store.description,
      primaryColor: store.primaryColor,
      whatsapp: store.whatsapp,
      phone: store.phone,
      address: store.address,
      storeHours: store.storeHours,
    },
    paymentAccounts,
  })
}
