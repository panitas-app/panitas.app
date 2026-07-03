import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { csrfGuard } from "@/lib/csrf"

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

  // Find the latest active subscription
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
  const { plan, period, paymentMethod, reference, bankOrigin, receiptImage, paidAt } = body

  if (!plan || !paymentMethod) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
  }

  // Determine amount based on plan and period
  const pricing: Record<string, { monthly: number; yearly: number }> = {
    emprendedor: { monthly: 15, yearly: 150 },
    reservas: { monthly: 15, yearly: 150 },
    agenda: { monthly: 15, yearly: 150 },
    negocio: { monthly: 25, yearly: 250 },
    empresarial: { monthly: 35, yearly: 350 },
    basico: { monthly: 15, yearly: 150 },
    basic: { monthly: 9.99, yearly: 99.99 },
    advanced: { monthly: 19.99, yearly: 199.99 },
    free: { monthly: 0, yearly: 0 },
  }
  const planPricing = pricing[plan as string]
  if (!planPricing) {
    return NextResponse.json({ error: "Plan inválido" }, { status: 400 })
  }

  const amount = period === "yearly" ? planPricing.yearly : planPricing.monthly

  const subscription = await prisma.storeSubscription.create({
    data: {
      storeId: store.id,
      plan,
      amount: amount * (period === "yearly" ? 12 : 1),
      currency: "USD",
      period: period || "monthly",
      status: "pending",
      paymentMethod,
      reference: reference || null,
      bankOrigin: bankOrigin || null,
      receiptImage: receiptImage || null,
      paidAt: paidAt ? new Date(paidAt) : null,
    },
  })

  return NextResponse.json(subscription, { status: 201 })
}
