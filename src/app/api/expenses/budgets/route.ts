import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore, requireRole } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"

export async function GET() {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const budgets = await prisma.expenseBudget.findMany({
    where: { storeId: current.store.id, month, year },
  })

  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0)

  const expenses = await prisma.expense.findMany({
    where: {
      storeId: current.store.id,
      date: { gte: startDate, lte: endDate },
    },
  })

  const spending: Record<string, number> = {}
  for (const e of expenses) {
    spending[e.category] = (spending[e.category] || 0) + e.amount
  }

  return NextResponse.json({ budgets, spending })
}

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  const current = await requireRole(["admin", "manager"])

  const body = await request.json()
  const now = new Date()
  const month = body.month || (now.getMonth() + 1)
  const year = body.year || now.getFullYear()

  const budget = await prisma.expenseBudget.upsert({
    where: {
      storeId_category_month_year: {
        storeId: current.store.id,
        category: body.category,
        month,
        year,
      },
    },
    update: { amount: parseFloat(body.amount) },
    create: {
      category: body.category,
      amount: parseFloat(body.amount),
      month,
      year,
      storeId: current.store.id,
    },
  })

  return NextResponse.json(budget, { status: 201 })
}
