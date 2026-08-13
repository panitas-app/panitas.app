import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

interface HealthCheck {
  name: string
  ok: boolean
  detail?: string
}

const REQUIRED_ENV: string[] = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "ADMIN_SECRET",
  "CRON_SECRET",
]

export async function GET() {
  const checks: HealthCheck[] = []

  try {
    await prisma.$queryRaw`SELECT 1`
    checks.push({ name: "database", ok: true })
  } catch {
    checks.push({ name: "database", ok: false, detail: "unreachable" })
  }

  for (const key of REQUIRED_ENV) {
    checks.push({ name: key, ok: Boolean(process.env[key]?.trim()) })
  }

  const ready = checks.every((check) => check.ok)

  return NextResponse.json(
    {
      status: ready ? "ready" : "degraded",
      checks,
      ts: new Date().toISOString(),
    },
    { status: ready ? 200 : 503 },
  )
}
