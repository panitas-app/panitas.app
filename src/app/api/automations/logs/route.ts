import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 200)

  const logs = await prisma.automationLog.findMany({
    where: { storeId: current.store.id },
    orderBy: { triggeredAt: "desc" },
    take: limit,
    include: {
      automation: { select: { name: true, trigger: true } },
      customer: { select: { name: true } },
    },
  })

  return NextResponse.json(logs)
}
