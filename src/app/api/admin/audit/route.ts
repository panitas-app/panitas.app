import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"

export async function GET(req: NextRequest) {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const action = searchParams.get("action") || ""
  const userId = searchParams.get("userId") || ""
  const entity = searchParams.get("entity") || ""
  const from = searchParams.get("from") || ""
  const to = searchParams.get("to") || ""
  const page = parseInt(searchParams.get("page") || "1")
  const limit = 50
  const skip = (page - 1) * limit

  const where: any = {}
  if (action) where.action = { contains: action, mode: "insensitive" }
  if (userId) where.userId = userId
  if (entity) where.entity = { contains: entity, mode: "insensitive" }
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from)
    if (to) where.createdAt.lte = new Date(to)
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip, take: limit,
    }),
    prisma.auditLog.count({ where }),
  ])

  return NextResponse.json({ data: logs, total, page, totalPages: Math.ceil(total / limit) })
}
