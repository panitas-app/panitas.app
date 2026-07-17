import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { templateLowStock } from "@/lib/email-templates"
import { timingSafeEqual } from "crypto"

function safeTokenMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, "utf8")
  const b = Buffer.from(expected, "utf8")
  if (a.length !== b.length) {
    timingSafeEqual(b, b)
    return false
  }
  return timingSafeEqual(a, b)
}

export async function POST(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 })
    }

    const authHeader = request.headers.get("authorization")
    const provided = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : ""
    if (!provided || !safeTokenMatch(provided, cronSecret)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const lowStockProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        stock: { lte: 5, gte: 0 },
        OR: [
          { lastStockAlert: null },
          { lastStockAlert: { lt: todayStart } },
        ],
      },
      select: {
        id: true,
        name: true,
        stock: true,
        sku: true,
        storeId: true,
        store: { select: { name: true, userId: true } },
      },
      take: 100,
    })

    // Group by store
    const byStore = new Map<string, typeof lowStockProducts>()
    for (const product of lowStockProducts) {
      const existing = byStore.get(product.storeId) || []
      existing.push(product)
      byStore.set(product.storeId, existing)
    }

    let sent = 0
    for (const [storeId, products] of byStore) {
      const store = products[0].store
      if (!store?.userId) continue

      const owner = await prisma.user.findUnique({
        where: { id: store.userId },
        select: { email: true },
      })
      if (!owner?.email) continue

      const productList = products
        .map(p => `${p.name} (stock: ${p.stock}${p.sku ? `, SKU: ${p.sku}` : ""})`)
        .join("<br>")

      await sendEmail(
        owner.email,
        `Productos con stock bajo — ${store.name}`,
        templateLowStock(store.name, productList),
        "low_stock"
      ).catch(e => console.error(`[cron low-stock] error store ${storeId}:`, e))

      // Mark all products as alerted today
      const productIds = products.map(p => p.id)
      await prisma.product.updateMany({
        where: { id: { in: productIds } },
        data: { lastStockAlert: now },
      })

      sent++
    }

    return NextResponse.json({ success: true, sent, total: lowStockProducts.length })
  } catch (error) {
    console.error("Cron low-stock error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
