import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore, requireRole } from "@/lib/permissions"
import { getPaginationParams, paginatedResponse } from "@/lib/pagination"
import { csrfGuard } from "@/lib/csrf"
import { rateLimit } from "@/lib/rate-limit"

export async function GET(request: NextRequest) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const { skip, take, page } = getPaginationParams(searchParams)
  const category = searchParams.get("category")
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const search = searchParams.get("search")
  const sort = searchParams.get("sort") || "date"
  const order = searchParams.get("order") || "desc"

  const where: any = { storeId: current.store.id }
  if (category && category !== "todas") where.category = category
  if (from) where.date = { ...where.date, gte: new Date(from) }
  if (to) where.date = { ...where.date, lte: new Date(to) }
  if (search) where.description = { contains: search }

  const orderBy: any = {}
  if (sort === "date") orderBy.date = order
  else if (sort === "amount") orderBy.amount = order
  else if (sort === "category") orderBy.category = order
  else orderBy.date = "desc"

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy,
      skip,
      take,
    }),
    prisma.expense.count({ where }),
  ])

  const categoryAgg = await prisma.expense.groupBy({
    by: ["category"],
    where: { storeId: current.store.id },
    _sum: { amount: true },
  })
  const byCategory: Record<string, number> = {}
  for (const c of categoryAgg) byCategory[c.category] = c._sum.amount || 0

  return NextResponse.json({
    ...paginatedResponse(expenses, total, page, take),
    byCategory,
    grandTotal: (await prisma.expense.aggregate({ where: { storeId: current.store.id }, _sum: { amount: true } }))._sum.amount || 0,
  })
}

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const rl = await rateLimit("create-expense", 30, 60 * 1000)
  if (!rl.success) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta en ${Math.ceil(rl.resetIn / 1000)}s` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
    )
  }

  const current = await requireRole(["admin", "manager"])

  const body = await request.json()

  const expense = await prisma.expense.create({
    data: {
      description: body.description,
      amount: parseFloat(body.amount),
      category: body.category || "otros",
      subcategory: body.subcategory || "",
      date: body.date ? new Date(body.date) : new Date(),
      paymentMethod: body.paymentMethod || "cash",
      vendor: body.vendor || "",
      documentRef: body.documentRef || "",
      isDeductible: body.isDeductible || false,
      isRecurring: body.isRecurring || false,
      notes: body.notes || null,
      storeId: current.store.id,
    },
  })

  return NextResponse.json(expense, { status: 201 })
}
