import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"
import { createAuditEntry } from "@/lib/audit"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params

  await prisma.user.update({
    where: { id },
    data: { suspendedAt: null, suspensionReason: null },
  })

  await createAuditEntry({
    action: "user.reactivated",
    entity: "User",
    entityId: id,
    userId: admin.id,
  })

  return NextResponse.json({ success: true })
}
