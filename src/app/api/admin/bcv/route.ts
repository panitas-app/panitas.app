import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"
import { runBcvScheduler } from "@/lib/bcv"

export async function GET() {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const latest = await prisma.bcvRate.findFirst({ orderBy: { createdAt: "desc" } })
  const history = await prisma.bcvRate.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { rate: true, createdAt: true, source: true },
  })
  const count = await prisma.bcvRate.count()

  return NextResponse.json({
    current: latest,
    history: history.reverse(),
    totalRecords: count,
    lastUpdate: latest?.createdAt || null,
    source: latest?.source || null,
  })
}

export async function POST() {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const result = await runBcvScheduler("admin_manual", true)
  return NextResponse.json(result)
}
