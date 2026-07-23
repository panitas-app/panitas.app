import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"
import { sendEmail, enviar2doPagoConfirmado, enviarRenovacionExitosa } from "@/lib/email"
import { templatePaymentVerified, templatePaymentRejected } from "@/lib/email-templates"
import { formatDate } from "@/lib/email-helpers"
import { createAuditEntry } from "@/lib/audit"
import { planIdToStorePlanType } from "@/lib/plans"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const subscription = await prisma.storeSubscription.findUnique({
    where: { id },
    include: {
      store: { select: { id: true, name: true, slug: true, plan: true, email: true, phone: true, createdAt: true } },
      verifiedBy: { select: { name: true, email: true } },
    },
  })

  if (!subscription) return NextResponse.json({ error: "No encontrada" }, { status: 404 })
  return NextResponse.json(subscription)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { status, notes, rejectionReason, notify } = body

  const existing = await prisma.storeSubscription.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

  const updateData: any = {}
  if (status === "active" || status === "verified") {
    const now = new Date()
    const endDate = new Date(now)
    if (existing.paymentMode === "installment" && !existing.secondPaymentPaid) {
      endDate.setDate(endDate.getDate() + 15)
    } else if (existing.period === "yearly") {
      endDate.setFullYear(endDate.getFullYear() + 1)
    } else {
      endDate.setDate(endDate.getDate() + 30)
    }

    updateData.status = status
    updateData.startDate = now
    updateData.endDate = endDate
    updateData.verifiedAt = now
    updateData.verifiedById = admin.id

    await prisma.store.update({
      where: { id: existing.storeId },
      data: { plan: existing.plan, planType: planIdToStorePlanType(existing.plan), planStatus: "activo" },
    })

    const store = await prisma.store.findUnique({ where: { id: existing.storeId } })
    if (store?.negocioId) {
      await prisma.negocio.update({
        where: { id: store.negocioId },
        data: { planEstado: "activo", planVencimiento: endDate },
      })
    }
  } else if (status === "rejected") {
    updateData.status = "rejected"
    updateData.rejectedAt = new Date()
    updateData.rejectionReason = rejectionReason || "Sin motivo especificado"
  } else if (status === "cancelled" || status === "expired") {
    updateData.status = status
  }

  if (notes !== undefined) updateData.notes = notes

  // NOTE: update + include triggers interactive transactions in Neon HTTP — do them separately
  await prisma.storeSubscription.update({ where: { id }, data: updateData })
  const subscription = await prisma.storeSubscription.findUnique({
    where: { id },
    include: { store: { select: { name: true, slug: true, plan: true, email: true } } },
  })

    await createAuditEntry({ action: `subscription.${status}`, entity: "StoreSubscription", entityId: id, userId: admin.id, storeId: existing.storeId })

    if (subscription.store.email && status && notify !== false) {
    const body = status === "active" || status === "verified"
      ? templatePaymentVerified(subscription.store.name, subscription.store.name, subscription.store.plan)
      : status === "rejected"
        ? templatePaymentRejected(subscription.store.name, subscription.store.name, subscription.store.plan, subscription.rejectionReason || undefined)
        : ""
    if (body) {
      sendEmail(subscription.store.email, "Actualización de suscripción", body, `subscription_${status}`)
        .catch(e => console.error("Email error:", e))
    }
  }

  return NextResponse.json(subscription)
}
