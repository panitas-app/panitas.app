import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { enviarEmailVerificado } from "@/lib/email"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  if (user.is_email_verified) {
    return NextResponse.json({ error: "El correo ya está verificado" }, { status: 400 })
  }

  const { code } = await req.json()
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Código requerido" }, { status: 400 })
  }

  if (!user.verification_token || !user.token_expires_at) {
    return NextResponse.json({ error: "No hay código pendiente. Solicita uno nuevo." }, { status: 400 })
  }

  if (new Date() > user.token_expires_at) {
    return NextResponse.json({ error: "El código ha expirado. Solicita uno nuevo." }, { status: 400 })
  }

  let storedCode: string | null = null
  try {
    const parsed = JSON.parse(user.verification_token)
    storedCode = parsed.codigo || null
  } catch {
    storedCode = user.verification_token
  }

  if (code !== storedCode) {
    return NextResponse.json({ error: "Código incorrecto" }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      is_email_verified: true,
      verification_token: null,
      token_expires_at: null,
    },
  })

  // Send welcome verified email
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
  enviarEmailVerificado(user.email!, user.name || "Usuario", `${baseUrl}/dashboard`)
    .catch(e => console.error("[verify-email] welcome verified error:", e))

  return NextResponse.json({ success: true })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")
  if (!token) {
    return NextResponse.redirect(new URL("/onboarding?error=missing_token", req.url))
  }

  const users = await prisma.user.findMany({
    where: {
      verification_token: { contains: token },
      token_expires_at: { gt: new Date() },
    },
  })

  if (users.length === 0) {
    return NextResponse.redirect(new URL("/onboarding?error=invalid_token", req.url))
  }

  const user = users[0]
  let storedToken: string | null = null
  try {
    const parsed = JSON.parse(user.verification_token!)
    storedToken = parsed.token || null
  } catch {
    storedToken = user.verification_token
  }

  if (token !== storedToken) {
    return NextResponse.redirect(new URL("/onboarding?error=invalid_token", req.url))
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      is_email_verified: true,
      verification_token: null,
      token_expires_at: null,
    },
  })

  // Send welcome verified email
  if (user.email) {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    enviarEmailVerificado(user.email, user.name || "Usuario", `${baseUrl}/dashboard`)
      .catch(e => console.error("[verify-email] welcome verified error:", e))
  }

  return NextResponse.redirect(new URL("/onboarding?verified=true", req.url))
}
