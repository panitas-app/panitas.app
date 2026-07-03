import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"

export async function GET() {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const data = await prisma.store.findMany({
    select: {
      id: true, name: true, slug: true, plan: true, isActive: true, createdAt: true, email: true, phone: true,
      _count: { select: { products: true, orders: true, members: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ data })
}
