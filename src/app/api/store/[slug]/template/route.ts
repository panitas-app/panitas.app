import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { slug } = await params

  const store = await prisma.store.findUnique({
    where: { id: slug },
    select: { userId: true },
  })

  if (!store || store.userId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const body = await req.json()
  const { template } = body

  if (!template || !["modern", "express", "delivery", "premium"].includes(template)) {
    return NextResponse.json({ error: "Plantilla inválida" }, { status: 400 })
  }

  await prisma.store.update({
    where: { id: slug },
    data: { template },
  })

  return NextResponse.json({ success: true, template })
}
