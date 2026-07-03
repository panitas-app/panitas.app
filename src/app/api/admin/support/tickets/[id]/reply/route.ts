import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"
import { createAuditEntry } from "@/lib/audit"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const content = body.content || ""

  if (!content.trim()) return NextResponse.json({ error: "El contenido es requerido" }, { status: 400 })

  await prisma.supportMessage.create({
    data: {
      ticketId: id,
      senderId: admin.id,
      senderType: "admin",
      content,
    },
  })

  await prisma.supportTicket.update({
    where: { id },
    data: { status: "in_progress", updatedAt: new Date() },
  })

  await createAuditEntry({
    action: "support.replied",
    entity: "SupportTicket",
    entityId: id,
    userId: admin.id,
  })

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { name: true } } },
      },
    },
  })

  return NextResponse.json(ticket)
}
