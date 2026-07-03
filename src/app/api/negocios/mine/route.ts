import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const negocio = await prisma.negocio.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      planId: true,
      modalidad: true,
      planEstado: true,
      planVencimiento: true,
    },
  })

  if (!negocio) {
    return NextResponse.json({ error: "No tienes un negocio registrado" }, { status: 404 })
  }

  return NextResponse.json(negocio)
}
