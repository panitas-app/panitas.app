import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  const { id } = await params
  const current = await requireRole(["admin", "manager"])

  const account = await prisma.paymentAccount.findUnique({ where: { id } })
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (account.storeId !== current.store.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const body = await request.json()

  const updated = await prisma.paymentAccount.update({
    where: { id },
    data: {
      ...(body.type && { type: body.type }),
      ...(body.bankName !== undefined && { bankName: body.bankName }),
      ...(body.bankCode !== undefined && { bankCode: body.bankCode }),
      ...(body.accountType !== undefined && { accountType: body.accountType }),
      ...(body.accountNumber !== undefined && { accountNumber: body.accountNumber }),
      ...(body.accountHolder !== undefined && { accountHolder: body.accountHolder }),
      ...(body.documentId !== undefined && { documentId: body.documentId }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.phoneBank !== undefined && { phoneBank: body.phoneBank }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  const { id } = await params
  const current = await requireRole(["admin"])

  const account = await prisma.paymentAccount.findUnique({ where: { id } })
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (account.storeId !== current.store.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  await prisma.paymentAccount.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
