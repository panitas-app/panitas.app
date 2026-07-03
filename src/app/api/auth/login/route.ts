import { NextResponse } from "next/server"
import { signIn } from "@/lib/auth"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const { success, remaining, resetIn } = await rateLimit(`login:${ip}`, 5, 60 * 1000)
    if (!success) {
      return NextResponse.json(
        { error: `Demasiados intentos. Intenta de nuevo en ${Math.ceil(resetIn / 1000)}s` },
        { status: 429, headers: { "Retry-After": String(Math.ceil(resetIn / 1000)) } }
      )
    }

    const { email, password } = await req.json()

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 400 })
    }

    const trimmedEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json({ error: "Formato de correo inválido" }, { status: 400 })
    }

    const result = await signIn("credentials", {
      email: trimmedEmail,
      password,
      redirect: false,
    })

    if (!result || !result.ok) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
