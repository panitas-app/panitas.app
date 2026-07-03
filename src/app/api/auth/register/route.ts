import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { rateLimit, getClientIp } from "@/lib/rate-limit"
import { enviarBienvenida } from "@/lib/resend-email"

const PASSWORD_MIN_LENGTH = 8
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=<>?/]).{8,}$/

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const { success, remaining, resetIn } = await rateLimit(`register:${ip}`, 3, 15 * 60 * 1000)
    if (!success) {
      return NextResponse.json(
        { error: `Demasiados intentos. Intenta de nuevo en ${Math.ceil(resetIn / 1000)}s` },
        { status: 429, headers: { "Retry-After": String(Math.ceil(resetIn / 1000)) } }
      )
    }

    const { name, email, password } = await req.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string") {
      return NextResponse.json({ error: "Formato de datos inválido" }, { status: 400 })
    }

    const trimmedEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json({ error: "Formato de correo inválido" }, { status: 400 })
    }

    const trimmedName = name.trim().slice(0, 100)
    if (trimmedName.length < 2) {
      return NextResponse.json({ error: "El nombre debe tener al menos 2 caracteres" }, { status: 400 })
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      return NextResponse.json({
        error: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres, incluyendo mayúscula, minúscula, número y carácter especial`,
      }, { status: 400 })
    }

    if (!PASSWORD_REGEX.test(password)) {
      return NextResponse.json({
        error: "La contraseña debe incluir mayúscula, minúscula, número y carácter especial",
      }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } })
    if (existing) {
      return NextResponse.json({ error: "El correo ya está registrado" }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    await prisma.user.create({
      data: {
        name: trimmedName,
        email: trimmedEmail,
        password: hashedPassword,
      },
    })

    enviarBienvenida(trimmedEmail, trimmedName)
      .catch(e => console.error("[welcome email error]", e))

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
