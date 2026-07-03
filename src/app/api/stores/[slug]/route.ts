import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getEffectiveRate } from "@/lib/bcv"

function parseImages(value: string): string[] {
  try { return JSON.parse(value) } catch { return [] }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const store = await prisma.store.findUnique({
    where: { slug, isActive: true },
    include: {
      categories: { orderBy: { order: "asc" } },
      products: { where: { isActive: true }, include: { category: true } },
      paymentAccounts: { where: { isActive: true } },
    },
  })
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 })

  const bcvRate = await getEffectiveRate()

  const products = store.products.map((p) => ({
    ...p,
    images: parseImages(p.images),
  }))

  return NextResponse.json({ ...store, products, bcvRate })
}
