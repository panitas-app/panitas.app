import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createSellerToken, setSellerCookie } from "@/lib/seller-auth"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    if (!username || !password) {
      return NextResponse.json({ error: "Usuario y contraseña requeridos" }, { status: 400 })
    }

    const seller = await prisma.seller.findFirst({
      where: { username, isActive: true },
      include: { store: { select: { id: true, name: true, slug: true } } },
    })

    if (!seller || !seller.passwordHash) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, seller.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })
    }

    const token = createSellerToken(seller.id, seller.storeId)

    return NextResponse.json(
      { seller: { id: seller.id, name: seller.name, store: seller.store } },
      { headers: { "Set-Cookie": setSellerCookie(token) } }
    )
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
