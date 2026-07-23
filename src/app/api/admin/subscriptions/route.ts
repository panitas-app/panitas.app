import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"

export async function GET(req: NextRequest) {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const page = parseInt(searchParams.get("page") || "1")
  const limit = 20
  const skip = (page - 1) * limit

  const where: any = {}
  if (status && ["pending", "active", "expired", "cancelled"].includes(status)) where.status = status

  const [data, total] = await Promise.all([
    prisma.storeSubscription.findMany({
      where,
      include: { store: { select: { name: true, slug: true, plan: true } }, verifiedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip, take: limit,
    }),
    prisma.storeSubscription.count({ where }),
  ])

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const { storeId, plan, amount, currency, period, notes } = body
  if (!storeId || !plan || !amount) return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })

  // NOTE: create + include triggers interactive transactions in Neon HTTP — do them separately
  const created = await prisma.storeSubscription.create({
    data: { storeId, plan, amount, currency: currency || "USD", period: period || "monthly", status: "pending", notes },
  })
  const subscription = await prisma.storeSubscription.findUnique({
    where: { id: created.id },
    include: { store: { select: { name: true, slug: true } } },
  })

  return NextResponse.json(subscription, { status: 201 })
}
