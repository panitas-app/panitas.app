import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"
import { createAuditEntry } from "@/lib/audit"

export async function POST(req: NextRequest) {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  if (!Array.isArray(body.items)) {
    return NextResponse.json({ error: "items debe ser un array" }, { status: 400 })
  }

  await prisma.$transaction(
    body.items.map((item: { id: string; orden: number }) =>
      prisma.salesSection.update({
        where: { id: item.id },
        data: { orden: item.orden },
      })
    )
  )

  await createAuditEntry({
    action: "sales_section.reordered",
    entity: "SalesSection",
    userId: admin.id,
    metadata: { count: body.items.length },
  })

  return NextResponse.json({ success: true })
}
