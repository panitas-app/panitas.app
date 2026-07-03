import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ completed: true })

  const store = await prisma.store.findUnique({
    where: { userId },
    select: { tutorialCompleted: true },
  })

  return NextResponse.json({ completed: store?.tutorialCompleted ?? false })
}
