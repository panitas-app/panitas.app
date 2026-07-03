import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const store = await prisma.store.findUnique({ where: { userId } })
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 })

  await prisma.store.update({
    where: { id: store.id },
    data: { tutorialCompleted: false },
  })

  return NextResponse.json({ success: true })
}
