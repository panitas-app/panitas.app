import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"
import { createAuditEntry } from "@/lib/audit"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const reason = body.reason || "Sin motivo especificado"

  await prisma.user.update({
    where: { id },
    data: { suspendedAt: new Date(), suspensionReason: reason },
  })

  await createAuditEntry({
    action: "user.suspended",
    entity: "User",
    entityId: id,
    userId: admin.id,
    metadata: { reason },
  })

  return NextResponse.json({ success: true })
}
