import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const member = await prisma.storeMember.findFirst({
      where: { userId: session.user.id },
      select: { store: { select: { id: true } } },
    })
    const store = member?.store ?? await prisma.store.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })

    if (!store) {
      return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1))
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()))

    // Start and end of selected month
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0, 23, 59, 59, 999)

    // Fixed expenses (isRecurring = true) for the selected month
    const fixedExpenses = await prisma.expense.findMany({
      where: {
        storeId: store.id,
        isRecurring: true,
        date: { gte: start, lte: end },
      },
      select: { amount: true, category: true, description: true },
    })

    const puntoEquilibrio = fixedExpenses.reduce((sum, e) => sum + e.amount, 0)

    // Desglose por categoria
    const byCategory: Record<string, number> = {}
    for (const e of fixedExpenses) {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount
    }
    const categorias = Object.entries(byCategory)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)

    // Sales revenue for the selected month (excluye canceladas)
    const salesAgg = await prisma.order.aggregate({
      where: {
        storeId: store.id,
        status: { not: "cancelled" },
        createdAt: { gte: start, lte: end },
      },
      _sum: { total: true },
    })
    const ventasMes = salesAgg._sum.total || 0

    // Balance
    const balance = ventasMes - puntoEquilibrio
    const porcentaje = puntoEquilibrio > 0 ? Math.round((ventasMes / puntoEquilibrio) * 100) : 100

    // Total gastos del mes (incluyendo no recurrentes) para contexto
    const totalExpensesAgg = await prisma.expense.aggregate({
      where: { storeId: store.id, date: { gte: start, lte: end } },
      _sum: { amount: true },
    })
    const gastosTotales = totalExpensesAgg._sum.amount || 0

    return NextResponse.json({
      puntoEquilibrio,
      ventasMes,
      balance,
      porcentaje,
      gastosTotales,
      gastosFijos: puntoEquilibrio,
      categorias,
      month,
      year,
    })
  } catch (err) {
    console.error("[breakeven]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
