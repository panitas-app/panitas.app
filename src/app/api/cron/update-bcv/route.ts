import { NextRequest, NextResponse } from "next/server"
import { runBcvScheduler, getConfig } from "@/lib/bcv"
import { timingSafeEqual } from "crypto"

function safeTokenMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, "utf8")
  const b = Buffer.from(expected, "utf8")
  if (a.length !== b.length) {
    timingSafeEqual(b, b)
    return false
  }
  return timingSafeEqual(a, b)
}

export async function GET(request: NextRequest) {
  return handleUpdate(request)
}

export async function POST(request: NextRequest) {
  return handleUpdate(request)
}

async function handleUpdate(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      console.error("CRON_SECRET no está configurado. Rechazando request.")
      return NextResponse.json(
        { error: "Servicio no disponible" },
        { status: 503 },
      )
    }

    const authHeader = request.headers.get("authorization")
    const provided = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : ""
    if (!provided || !safeTokenMatch(provided, cronSecret)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const config = getConfig()
    const result = await runBcvScheduler("cron")

    return NextResponse.json({
      success: true,
      action: result.action,
      rate: result.rate,
      message: result.message,
      config: {
        timezone: config.timezone,
        monitorStartHour: config.monitorStartHour,
        monitorEndHour: config.monitorEndHour,
      },
    })
  } catch (error) {
    console.error("Cron update BCV error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
