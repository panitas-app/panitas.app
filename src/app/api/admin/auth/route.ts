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
    let superadmin = await prisma.user.findFirst({ where: { role: "superadmin" } })
    if (!superadmin) {
      // Auto-create superadmin if none exists (ADMIN_SECRET already validated)
      const email = process.env.ADMIN_EMAIL || "admin@panitas.app"
      superadmin = await prisma.user.create({
        data: {
          email,
          name: "Superadmin",
          role: "superadmin",
          is_email_verified: true,
        },
      })
      console.log(`[admin-auth] Superadmin auto-creado: ${email}`)
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
