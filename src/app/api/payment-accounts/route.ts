import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  const current = await requireRole(["admin", "manager"])

  const body = await request.json()

  const account = await prisma.paymentAccount.create({
    data: {
      type: body.type || "bank",
      bankName: body.bankName,
      bankCode: body.bankCode,
      accountType: body.accountType,
      accountNumber: body.accountNumber,
      accountHolder: body.accountHolder,
      documentId: body.documentId,
      phone: body.phone,
      phoneBank: body.phoneBank,
      storeId: current.store.id,
    },
  })

  return NextResponse.json(account, { status: 201 })
}
