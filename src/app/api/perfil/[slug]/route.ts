import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getEffectiveRate } from "@/lib/bcv"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

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
      planType: true,
      negocioId: true,
      storeHours: true,
      instagram: true,
      facebook: true,
      tiktok: true,
      twitter: true,
      youtube: true,
      linkedin: true,
    },
  })

  if (!store) {
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })
  }

  const negocioId = store.negocioId
  if (!negocioId) {
    return NextResponse.json({ error: "Perfil no disponible" }, { status: 404 })
  }

  const [services, agendas, paymentAccounts] = await Promise.all([
    prisma.service.findMany({
      where: { negocioId, isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.agenda.findMany({
      where: { negocioId },
      select: { id: true, nombre: true },
    }),
    prisma.paymentAccount.findMany({
      where: { storeId: store.id, isActive: true },
    }),
  ])

  return NextResponse.json({
    store,
    services,
    agendas,
    paymentAccounts,
  })
}
