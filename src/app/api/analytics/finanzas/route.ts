import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore } from "@/lib/permissions"

export async function GET() {
  let storeInfo
  try {
    storeInfo = await getCurrentStore()
    if (!storeInfo) throw new Error("No tienes acceso a esta tienda")
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }

  const products = await prisma.product.findMany({
    where: { storeId: storeInfo.store.id },
    orderBy: { name: "asc" },
  })

  const expenses = await prisma.expense.findMany({
    where: { storeId: storeInfo.store.id },
  })

  const totalCostValue = products.reduce((sum, p) => sum + (p.costPrice ?? 0) * p.stock, 0)
  const totalSellValue = products.reduce((sum, p) => sum + p.price * p.stock, 0)
  const totalProfit = totalSellValue - totalCostValue
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  return NextResponse.json({
    totalCostValue,
    totalSellValue,
    totalProfit,
    totalExpenses,
    profitMargin: totalSellValue > 0 ? (totalProfit / totalSellValue) * 100 : 0,
    productCount: products.length,
    products: products.map((p) => {
      const costPrice = p.costPrice ?? 0
      const marginPerUnit = p.price - costPrice
      const marginPercent = p.price > 0 ? ((p.price - costPrice) / p.price) * 100 : 0
      return {
        id: p.id,
        name: p.name,
        stock: p.stock,
        costPrice,
        price: p.price,
        marginPerUnit,
        marginPercent,
      }
    }),
  })
}
