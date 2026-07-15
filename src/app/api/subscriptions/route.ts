import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { csrfGuard } from "@/lib/csrf"
import { sendEmail } from "@/lib/email"
import { templatePaymentPending } from "@/lib/email-templates"
import { getPostHogClient } from "@/lib/posthog-server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })

  const store = await prisma.store.findFirst({
    where: {
      OR: [
        { userId: user.id },
        { members: { some: { userId: user.id } } },
      ],
    },
  })

  if (!store) {
    return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 })
  }

  const subscriptions = await prisma.storeSubscription.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
  })

  const active = subscriptions.find((s) => s.status === "active")

  return NextResponse.json({ subscriptions, active })
}

export async function POST(req: NextRequest) {
  const csrf = csrfGuard(req)
  if (csrf) return csrf
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })

  const store = await prisma.store.findFirst({
    where: { userId: user.id },
  })

  if (!store) {
    return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 })
  }

  const body = await req.json()
  const { plan, period, paymentMode, paymentMethod, reference, bankOrigin, receiptImage, paidAt } = body

  if (!plan || !paymentMethod) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
  }

  const pricing: Record<string, { monthly: number; yearly: number; installmentAmount: number }> = {
    agenda: { monthly: 15, yearly: 150, installmentAmount: 9 },
    comercio: { monthly: 25, yearly: 250, installmentAmount: 14 },
    mayorista: { monthly: 45, yearly: 450, installmentAmount: 25 },
    emprendedor: { monthly: 25, yearly: 250, installmentAmount: 14 },
    negocio: { monthly: 25, yearly: 250, installmentAmount: 14 },
    empresarial: { monthly: 45, yearly: 450, installmentAmount: 25 },
    basico: { monthly: 15, yearly: 150, installmentAmount: 9 },
    basic: { monthly: 15, yearly: 150, installmentAmount: 9 },
    advanced: { monthly: 25, yearly: 250, installmentAmount: 14 },
    reservas: { monthly: 15, yearly: 150, installmentAmount: 9 },
    free: { monthly: 0, yearly: 0, installmentAmount: 0 },
  }
  const planPricing = pricing[plan as string]
  if (!planPricing) {
    return NextResponse.json({ error: "Plan inválido" }, { status: 400 })
  }

  const isInstallment = paymentMode === "installment" && period !== "yearly"
  const amount = isInstallment ? planPricing.installmentAmount : period === "yearly" ? planPricing.yearly : planPricing.monthly
  const secondPaymentDue = isInstallment ? new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) : null

  const subscription = await prisma.storeSubscription.create({
    data: {
      storeId: store.id,
      plan,
      amount,
      currency: "USD",
      period: period || "monthly",
      status: "pending",
      paymentMethod,
      reference: reference || null,
      bankOrigin: bankOrigin || null,
      receiptImage: receiptImage || null,
      paidAt: paidAt ? new Date(paidAt) : null,
      paymentMode: isInstallment ? "installment" : "single",
      installmentAmount: isInstallment ? planPricing.installmentAmount : null,
      secondPaymentDue,
    },
  })

  sendEmail(
    user.email || "",
    "Recibimos tu comprobante de pago — Panitas",
    templatePaymentPending(user.name || "Usuario", plan, subscription.amount, reference || ""),
    "payment_pending"
  ).catch(e => console.error("[subscription email] payment pending error:", e))

  const posthog = getPostHogClient()
  posthog.capture({
    distinctId: user.id,
    event: "subscription_requested",
    properties: {
      plan,
      period: period || "monthly",
      payment_mode: isInstallment ? "installment" : "single",
      amount,
      payment_method: paymentMethod,
      store_id: store.id,
    },
  })
  await posthog.flush()

  return NextResponse.json(subscription, { status: 201 })
}
