import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const methods = await prisma.adminPaymentAccount.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(methods)
}
