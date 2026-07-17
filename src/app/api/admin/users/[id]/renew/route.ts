import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"
import { createAuditEntry } from "@/lib/audit"
import { enviarRenovacionExitosa } from "@/lib/email"
import { formatDate } from "@/lib/email-helpers"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const { days } = await req.json()

  if (days !== 15 && days !== 30) {
    return NextResponse.json({ error: "Días inválido: debe ser 15 o 30" }, { status: 400 })
  }

  const negocio = await prisma.negocio.findUnique({ where: { userId: id } })
  if (!negocio) {
    return NextResponse.json({ error: "Usuario sin negocio" }, { status: 404 })
  }

  const now = new Date()
  const currentEnd = negocio.planVencimiento && negocio.planVencimiento > now
    ? new Date(negocio.planVencimiento)
    : now
  currentEnd.setDate(currentEnd.getDate() + days)

  await prisma.negocio.update({
    where: { id: negocio.id },
    data: {
      planVencimiento: currentEnd,
      planEstado: "activo",
    },
  })

  if (days === 15) {
    const store = await prisma.store.findUnique({ where: { negocioId: negocio.id } })
    if (store) {
      const latestSub = await prisma.storeSubscription.findFirst({
        where: { storeId: store.id, paymentMode: "installment" },
        orderBy: { createdAt: "desc" },
      })
      if (latestSub) {
        const newSecondDue = new Date(currentEnd)
        newSecondDue.setDate(newSecondDue.getDate() + 15)
        await prisma.storeSubscription.update({
          where: { id: latestSub.id },
          data: {
            secondPaymentPaid: false,
            secondPaymentDue: newSecondDue,
            status: "active",
          },
        })
      }
    }
  }

  await createAuditEntry({
    action: `subscription.renew.${days}d`,
    entity: "Negocio",
    entityId: negocio.id,
    userId: admin.id,
    metadata: { userId: id, daysAdded: days, newEndDate: currentEnd.toISOString() },
  })

  // Send renewal success email
  const store = await prisma.store.findUnique({ where: { negocioId: negocio.id }, select: { name: true, userId: true } })
  if (store?.userId) {
    const owner = await prisma.user.findUnique({ where: { id: store.userId }, select: { email: true } })
    if (owner?.email) {
      enviarRenovacionExitosa(owner.email, {
        tiendaNombre: store.name || "Tu tienda",
        plan: negocio.planId,
        periodo: "monthly",
        nuevaExpiracion: formatDate(currentEnd),
        monto: 0,
      }).catch(e => console.error("[renew email] renewal error:", e))
    }
  }

  return NextResponse.json({ success: true, newEndDate: currentEnd.toISOString() })
}
