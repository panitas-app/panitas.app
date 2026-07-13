import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendSMS } from "@/lib/twilio"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const { phone } = await req.json()
  if (!phone || typeof phone !== "string") {
    return NextResponse.json({ error: "Número de teléfono requerido" }, { status: 400 })
  }

  // Normalize phone: ensure it starts with +
  const normalizedPhone = phone.startsWith("+") ? phone : `+${phone.replace(/\D/g, "")}`

  const codigo = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

  // Store code in verification_token with type prefix
  await prisma.user.update({
    where: { id: user.id },
    data: {
      verification_token: JSON.stringify({ type: "phone", code: codigo, phone: normalizedPhone, expiresAt: expiresAt.toISOString() }),
      token_expires_at: expiresAt,
    },
  })

  const sent = await sendSMS(normalizedPhone, `Tu código de verificación de Panitas es: ${codigo}. Válido por 5 minutos.`)

  if (!sent) {
    return NextResponse.json({ error: "Error al enviar SMS. Intenta de nuevo." }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: "Código enviado por SMS" })
}
