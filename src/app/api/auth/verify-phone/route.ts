import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
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
  let storedPhone: string | null = null
  try {
    const parsed = JSON.parse(user.verification_token)
    if (parsed.type !== "phone") {
      return NextResponse.json({ error: "No hay código SMS pendiente" }, { status: 400 })
    }
    storedCode = parsed.code || null
    storedPhone = parsed.phone || null
  } catch {
    return NextResponse.json({ error: "No hay código SMS pendiente" }, { status: 400 })
  }

  if (code !== storedCode) {
    return NextResponse.json({ error: "Código incorrecto" }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      phone: storedPhone,
      phoneVerified: true,
      verification_token: null,
      token_expires_at: null,
    },
  })

  return NextResponse.json({ success: true, message: "Teléfono verificado exitosamente" })
}
