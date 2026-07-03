import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"
import { createAuditEntry } from "@/lib/audit"

export async function GET() {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const settings = await prisma.adminSetting.findMany()
  const result: Record<string, string> = {}
  for (const s of settings) {
    result[s.key] = s.value
  }

  return NextResponse.json(result)
}

export async function PUT(req: NextRequest) {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const { key, value } = body

  if (!key) return NextResponse.json({ error: "Key requerida" }, { status: 400 })

  await prisma.adminSetting.upsert({
    where: { key },
    update: { value: JSON.stringify(value) },
    create: { key, value: JSON.stringify(value) },
  })

  await createAuditEntry({
    action: "settings.updated",
    entity: "AdminSetting",
    entityId: key,
    userId: admin.id,
    metadata: { key },
  })

  return NextResponse.json({ success: true })
}
