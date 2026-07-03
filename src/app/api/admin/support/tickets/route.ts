import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"

export async function GET(req: NextRequest) {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const data = await prisma.supportTicket.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { name: true, email: true } } },
  })

  return NextResponse.json({ data })
}
