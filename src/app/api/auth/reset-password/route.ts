import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { rateLimit, getClientIp } from "@/lib/rate-limit"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const { success, resetIn } = await rateLimit(`reset-password:${ip}`, 5, 5 * 60 * 1000)
    if (!success) {
      return NextResponse.json(
        { error: `Demasiados intentos. Intenta de nuevo en ${Math.ceil(resetIn / 1000)}s` },
        { status: 429, headers: { "Retry-After": String(Math.ceil(resetIn / 1000)) } }
      )
    }

    const { email, code, password } = await req.json()

    if (!email || !code || !password || typeof email !== "string" || typeof code !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 })
    }

    const trimmedEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json({ error: "Formato de correo inválido" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
      select: { id: true, verification_token: true, token_expires_at: true },
    })

    if (!user || !user.verification_token || !user.token_expires_at) {
      return NextResponse.json({ error: "Código inválido o expirado" }, { status: 400 })
    }

    let parsed: { type?: string; code?: string; token?: string; expiresAt?: string }
    try {
      parsed = JSON.parse(user.verification_token)
    } catch {
      return NextResponse.json({ error: "Código inválido o expirado" }, { status: 400 })
    }

    if (parsed.type !== "password_reset") {
      return NextResponse.json({ error: "Código inválido o expirado" }, { status: 400 })
    }

    const trimmedCode = code.trim().toUpperCase()
    const isValidCode = parsed.code === trimmedCode || parsed.token === trimmedCode || parsed.token?.toUpperCase() === trimmedCode

    if (!isValidCode) {
      return NextResponse.json({ error: "Código incorrecto" }, { status: 400 })
    }

    const now = new Date()
    const expires = new Date(parsed.expiresAt || user.token_expires_at)
    if (now > expires) {
      await prisma.user.update({
        where: { id: user.id },
        data: { verification_token: null, token_expires_at: null },
      })
      return NextResponse.json({ error: "El código ha expirado. Solicita uno nuevo." }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        verification_token: null,
        token_expires_at: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[reset-password]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
