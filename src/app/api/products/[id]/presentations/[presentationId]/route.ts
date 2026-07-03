import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore, requireRole } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; presentationId: string }> }
) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  const { id, presentationId } = await params
  const current = await requireRole(["admin", "manager"])

  const product = await prisma.product.findUnique({ where: { id } })
  if (!product || product.storeId !== current.store.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const presentation = await prisma.productPresentation.findUnique({
    where: { id: presentationId },
  })
  if (!presentation || presentation.productId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.productPresentation.delete({ where: { id: presentationId } })

  return NextResponse.json({ success: true })
}
