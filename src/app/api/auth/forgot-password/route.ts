import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { rateLimit, getClientIp } from "@/lib/rate-limit"
import crypto from "crypto"
import { enviarRecuperarContrasena } from "@/lib/email"

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const { success, remaining, resetIn } = await rateLimit(`forgot-password:${ip}`, 3, 15 * 60 * 1000)
    if (!success) {
      return NextResponse.json(
        { error: `Demasiados intentos. Intenta de nuevo en ${Math.ceil(resetIn / 1000)}s` },
        { status: 429, headers: { "Retry-After": String(Math.ceil(resetIn / 1000)) } }
      )
    }

    const { email } = await req.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Correo requerido" }, { status: 400 })
    }

    const trimmedEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json({ error: "Formato de correo inválido" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
      select: { id: true, name: true, email: true, password: true },
    })

    if (!user || !user.password) {
      return NextResponse.json({ success: true, remaining: remaining - 1 })
    }

    const code = String(Math.floor(100000 + Math.random() * 900000))
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verification_token: JSON.stringify({ type: "password_reset", code, token, expiresAt: expiresAt.toISOString() }),
        token_expires_at: expiresAt,
      },
    })

    const resetLink = `${process.env.NEXTAUTH_URL || "https://panitas.app"}/restablecer?email=${encodeURIComponent(trimmedEmail)}&token=${token}`
    await enviarRecuperarContrasena(trimmedEmail, user.name || trimmedEmail.split("@")[0], code, resetLink)

    return NextResponse.json({ success: true, remaining: remaining - 1 })
  } catch (err) {
    console.error("[forgot-password]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
