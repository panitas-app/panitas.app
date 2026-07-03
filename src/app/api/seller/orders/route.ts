import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSellerFromCookies } from "@/lib/seller-auth"
import { generateOrderNumber } from "@/lib/utils"
import { createAuditEntry } from "@/lib/audit"

export async function POST(request: NextRequest) {
  try {
    const session = await getSellerFromCookies()
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const seller = await prisma.seller.findUnique({
      where: { id: session.sellerId },
      select: { id: true, name: true, storeId: true, isActive: true, commissionType: true, commissionValue: true },
    })

    if (!seller || !seller.isActive) {
      return NextResponse.json({ error: "Vendedor no encontrado o inactivo" }, { status: 403 })
    }

    const body = await request.json()
    const storeId = seller.storeId

    // ─── Products: validate stock & prices from DB ───
    const productIds = body.items.map((i: any) => i.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, stock: true, name: true, price: true },
    })
    const productMap = new Map(products.map((p) => [p.id, p]))

    const missingIds = productIds.filter((id: string) => !productMap.has(id))
    if (missingIds.length > 0) {
      return NextResponse.json({ error: `Productos no encontrados: ${missingIds.join(", ")}` }, { status: 400 })
    }

    const itemsData: Array<{ productId: string; quantity: number; price: number; subtotal: number; productName: string }> = []
    for (const item of body.items) {
      const product = productMap.get(item.productId)!
      const qty = parseInt(item.quantity)
      if (product.stock < qty) {
        return NextResponse.json({ error: `Stock insuficiente para "${product.name}"` }, { status: 400 })
      }
      const dbPrice = product.price
      itemsData.push({ productId: product.id, quantity: qty, price: dbPrice, subtotal: qty * dbPrice, productName: product.name })
    }

    const subtotal = itemsData.reduce((sum, i) => sum + i.subtotal, 0)
    const total = subtotal

    // ─── BCV rate ───
    const latestRate = await prisma.bcvRate.findFirst({ orderBy: { date: "desc" } })

    // ─── Find or create customer ───
    const customerPhone = body.customerPhone?.trim()
    let customerId: string | undefined
    if (customerPhone) {
      const existingCustomer = await prisma.customer.findUnique({
        where: { storeId_phone: { storeId, phone: customerPhone } },
      })
      if (existingCustomer) {
        customerId = existingCustomer.id
        await prisma.customer.update({ where: { id: existingCustomer.id }, data: { lastPurchaseAt: new Date() } })
      } else {
        const newCustomer = await prisma.customer.create({
          data: { storeId, name: body.customerName || "Cliente", phone: customerPhone, totalSpent: 0, totalOrders: 0, lastPurchaseAt: new Date() },
        })
        customerId = newCustomer.id
      }
    }

    // ─── Credit days ───
    let dueDate: Date | undefined
    const creditDays = body.creditDays ? parseInt(body.creditDays) : null
    if (creditDays && creditDays > 0) {
      dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + creditDays)
    }

    // ─── Create order ───
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        status: "pending",
        subtotal,
        discount: 0,
        shippingCost: 0,
        total,
        bcvRateAtOrder: latestRate?.rate || null,
        currency: "USD",
        customerName: body.customerName,
        customerPhone,
        customerAddress: body.customerAddress || null,
        customerId,
        shippingMethod: "pickup_store",
        sellerId: seller.id,
        sellerName: seller.name,
        storeId,
        creditDays,
        dueDate,
        items: {
          create: itemsData.map((i) => ({
            productId: i.productId, quantity: i.quantity, price: i.price, subtotal: i.subtotal, productName: i.productName,
          })),
        },
        payments: {
          create: {
            method: "credit",
            amount: total,
            status: "verified",
          },
        },
      },
      include: { items: { include: { product: true } }, payments: true },
    })

    // ─── Decrement stock + stock movements ───
    for (const item of itemsData) {
      const updated = await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      })
      await prisma.stockMovement.create({
        data: {
          type: "sale", quantity: -item.quantity, balance: updated.stock,
          concept: `Venta #${order.orderNumber}`,
          reference: order.id, productId: item.productId, storeId,
        },
      })
      if (updated.stock !== null && updated.stock > 0 && updated.stock <= 5) {
        await createAuditEntry({
          action: "stock.low", entity: "Product", entityId: updated.id,
          metadata: { productName: updated.name, remainingStock: updated.stock }, storeId,
        })
      }
    }

    // ─── Create seller commission ───
    if (seller.commissionType && seller.commissionValue) {
      let commissionAmount: number
      if (seller.commissionType === "percentage") {
        commissionAmount = total * (Number(seller.commissionValue) / 100)
      } else {
        commissionAmount = Number(seller.commissionValue)
      }
      await prisma.sellerCommission.create({
        data: {
          type: seller.commissionType, value: seller.commissionValue,
          amount: commissionAmount, status: "pending",
          sellerId: seller.id, orderId: order.id,
        },
      })
    }

    // ─── Update customer totals ───
    if (customerId) {
      await prisma.customer.update({
        where: { id: customerId },
        data: { totalSpent: { increment: total }, totalOrders: { increment: 1 } },
      })
    }

    return NextResponse.json(order, { status: 201 })
  } catch (error: any) {
    console.error("Seller order creation error:", error)
    return NextResponse.json({ error: error?.message || "Error al procesar" }, { status: 500 })
  }
}
