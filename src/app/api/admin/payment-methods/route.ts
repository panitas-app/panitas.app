import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"

export async function GET() {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const methods = await prisma.adminPaymentAccount.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(methods)
}

export async function POST(req: NextRequest) {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const method = await prisma.adminPaymentAccount.create({
    data: {
      type: body.type || "bank",
      bankName: body.bankName || null,
      bankCode: body.bankCode || null,
      accountType: body.accountType || null,
      accountNumber: body.accountNumber || null,
      accountHolder: body.accountHolder || null,
      documentId: body.documentId || null,
      phone: body.phone || null,
      phoneBank: body.phoneBank || null,
      email: body.email || null,
      isActive: body.isActive !== false,
    },
  })

  return NextResponse.json(method, { status: 201 })
}
