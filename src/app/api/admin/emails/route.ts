import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"

export async function GET(req: NextRequest) {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get("page") || "1")
  const limit = 50
  const skip = (page - 1) * limit

  const [data, total] = await Promise.all([
    prisma.emailLog.findMany({
      orderBy: { createdAt: "desc" },
      skip, take: limit,
    }),
    prisma.emailLog.count(),
  ])

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
}
