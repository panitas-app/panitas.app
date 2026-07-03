import { NextRequest, NextResponse } from "next/server"
import { validateAdminSecret, adminCookieOptions, ADMIN_COOKIE_NAME } from "@/lib/local-only"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { csrfGuard } from "@/lib/csrf"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  const csrf = csrfGuard(req)
  if (csrf) return csrf

  const ip = getClientIp(req)
  const rl = await rateLimit(`admin-auth:${ip}`, 5, 60 * 1000)
  if (!rl.success) {
    return NextResponse.json(
      { error: `Demasiados intentos. Intenta de nuevo en ${Math.ceil(rl.resetIn / 1000)}s` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
    )
  }

  let body: { secret?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const secret = typeof body.secret === "string" ? body.secret : ""
  if (!secret || !validateAdminSecret(secret)) {
    // Generic error to avoid revealing whether the secret is correct
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })
  }

  try {
    const superadmin = await prisma.user.findFirst({ where: { role: "superadmin" } })
    if (!superadmin) {
      return NextResponse.json(
        {
          error: "No se ha configurado la cuenta de Superadmin en la base de datos. Por favor, ejecuta el script de configuración antes de acceder.",
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Database connection check failed in admin auth:", error)
    return NextResponse.json({ error: "Error de conexión con la base de datos" }, { status: 500 })
  }

  const store = await cookies()
  store.set(ADMIN_COOKIE_NAME, secret, adminCookieOptions())

  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const store = await cookies()
  store.delete(ADMIN_COOKIE_NAME)
  return NextResponse.json({ success: true })
}
