import { NextResponse } from "next/server"
import { AuthError } from "next-auth"
import { signIn } from "@/lib/auth"
import { getPostHogClient } from "@/lib/posthog-server"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const { success, resetIn } = await rateLimit(`login:${ip}`, 5, 60 * 1000)
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

    try {
      // Auth.js v5 beta: signIn con redirect:false retorna un string (redirectUrl)
      // en exito y lanza AuthError si las credenciales son invalidas.
      await signIn("credentials", {
        email: trimmedEmail,
        password,
        redirect: false,
      })

      const posthog = getPostHogClient()
      posthog.capture({ distinctId: trimmedEmail, event: "user_logged_in" })
      await posthog.flush()

      return NextResponse.json({ success: true })
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })
      }
      console.error("[login error]", err)
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
    }
  } catch (err) {
    console.error("[login error]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
