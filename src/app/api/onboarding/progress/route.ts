import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const key = `onboarding:${session.user.id}`

  await prisma.adminSetting.upsert({
    where: { key },
    update: { value: JSON.stringify(body) },
    create: { key, value: JSON.stringify(body) },
  })

  return NextResponse.json({ success: true })
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const key = `onboarding:${session.user.id}`
  const record = await prisma.adminSetting.findUnique({ where: { key } })

  if (!record) return NextResponse.json(null)

  try {
    return NextResponse.json(JSON.parse(record.value))
  } catch {
    return NextResponse.json(null)
  }
}
