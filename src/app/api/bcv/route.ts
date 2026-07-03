import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { rateLimit } from "@/lib/rate-limit"
import { runBcvScheduler } from "@/lib/bcv"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rl = await rateLimit(`bcv:${session.user.id}`, 10, 60 * 1000)
  if (!rl.success) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta en ${Math.ceil(rl.resetIn / 1000)}s` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } },
    )
  }

  const latest = await prisma.bcvRate.findFirst({ orderBy: { createdAt: "desc" } })
  if (!latest) return NextResponse.json({ error: "No rate available" }, { status: 503 })

  return NextResponse.json(latest)
}

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rl = await rateLimit(`bcv-update:${session.user.id}`, 3, 60 * 1000)
  if (!rl.success) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Espera ${Math.ceil(rl.resetIn / 1000)}s` },
      { status: 429 },
    )
  }

  const result = await runBcvScheduler("manual", true)
  return NextResponse.json(result)
}

export async function PUT(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { rate: manualRate } = await request.json()
  if (!manualRate || typeof manualRate !== "number" || manualRate <= 0) {
    return NextResponse.json({ error: "Tasa inválida" }, { status: 400 })
  }

  const record = await prisma.bcvRate.create({
    data: { rate: manualRate, source: "manual" },
  })

  return NextResponse.json({ success: true, rate: record.rate })
}
