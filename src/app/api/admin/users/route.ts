import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"

export async function GET(req: NextRequest) {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""
  const plan = searchParams.get("plan") || ""
  const status = searchParams.get("status") || ""
  const page = parseInt(searchParams.get("page") || "1")
  const limit = 20
  const skip = (page - 1) * limit

  const where: any = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ]
  }
  if (status === "suspended") where.suspendedAt = { not: null }
  else if (status === "active") where.suspendedAt = null

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, image: true, role: true, createdAt: true,
        suspendedAt: true, suspensionReason: true,
        store: {
          select: {
            id: true, name: true, slug: true, plan: true, planType: true, planStatus: true,
            subscriptions: { select: { status: true }, orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
        negocio: { select: { id: true, planId: true, modalidad: true, planEstado: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
      skip, take: limit,
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({ data: users, total, page, totalPages: Math.ceil(total / limit) })
}
