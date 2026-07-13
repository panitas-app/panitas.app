import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { templateVerifyEmail } from "@/lib/email-templates"

export async function POST() {
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

  // Generate 6-digit code + UUID token
  const codigo = Math.floor(100000 + Math.random() * 900000).toString()
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      verification_token: JSON.stringify({ codigo, token }),
      token_expires_at: expiresAt,
    },
  })

  const link = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/verify-email?token=${token}`

  if (!user.email) {
    return NextResponse.json({ error: "El usuario no tiene correo" }, { status: 400 })
  }

  await sendEmail(
    user.email,
    "Verifica tu correo electrónico — Panitas",
    templateVerifyEmail(user.name || "Usuario", codigo, link),
    "verify_email"
  )

  return NextResponse.json({ success: true, message: "Código de verificación enviado" })
}
