import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const method = await prisma.adminPaymentAccount.findUnique({ where: { id } })
  if (!method) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  return NextResponse.json(method)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const method = await prisma.adminPaymentAccount.update({
    where: { id },
    data: {
      type: body.type,
      bankName: body.bankName ?? null,
      bankCode: body.bankCode ?? null,
      accountType: body.accountType ?? null,
      accountNumber: body.accountNumber ?? null,
      accountHolder: body.accountHolder ?? null,
      documentId: body.documentId ?? null,
      phone: body.phone ?? null,
      phoneBank: body.phoneBank ?? null,
      email: body.email ?? null,
      isActive: body.isActive,
    },
  })

  return NextResponse.json(method)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  await prisma.adminPaymentAccount.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
