import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentStore, requireRole } from "@/lib/permissions"
import { generateOrderNumber } from "@/lib/utils"
import { getPaginationParams, paginatedResponse } from "@/lib/pagination"
import { enviarAlertaNuevoPedido } from "@/lib/resend-email"
import { csrfGuard } from "@/lib/csrf"
import { createAuditEntry } from "@/lib/audit"
import { rateLimit } from "@/lib/rate-limit"

export async function GET(request: NextRequest) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const { skip, take, page } = getPaginationParams(searchParams)
  const status = searchParams.get("status")

  const where: any = { storeId: current.store.id }
  if (status && status !== "all") where.status = status

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: { include: { product: true } },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.order.count({ where }),
  ])

  return NextResponse.json(paginatedResponse(orders, total, page, take))
}

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const rl = await rateLimit("create-order", 20, 60 * 1000)
  if (!rl.success) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta en ${Math.ceil(rl.resetIn / 1000)}s` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
    )
  }

  try {
    const current = await requireRole(["admin", "manager", "seller"])
    const body = await request.json()

    let storeId = body.storeId

    if (!storeId) {
      storeId = current.store.id
    } else {
      const storeExists = await prisma.store.findUnique({ where: { id: storeId } })
      if (!storeExists) {
        return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 })
      }
    }

    // ─── Products: fetch real prices from DB ───
    const productIds = body.items.map((i: any) => i.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, stock: true, name: true, price: true },
    })
    const productMap = new Map(products.map((p) => [p.id, p]))

    // Check missing
    const missingIds = productIds.filter((id: string) => !productMap.has(id))
    if (missingIds.length > 0) {
      return NextResponse.json(
        { error: `Productos no encontrados: ${missingIds.join(", ")}` },
        { status: 400 }
      )
    }

    // Check stock & build items with DB prices
    const itemsData: Array<{ productId: string; quantity: number; price: number; subtotal: number; productName: string }> = []
    for (const item of body.items) {
      const product = productMap.get(item.productId)!
      const qty = parseInt(item.quantity)
      if (product.stock < qty) {
        return NextResponse.json(
          { error: `Stock insuficiente para "${product.name}". Disponible: ${product.stock}, solicitado: ${qty}` },
          { status: 400 }
        )
      }
      // Use DB price, ignore client-supplied price
      const dbPrice = product.price
      itemsData.push({
        productId: product.id,
        quantity: qty,
        price: dbPrice,
        subtotal: qty * dbPrice,
        productName: product.name,
      })
    }

    // ─── Calculate totals server-side ───
    const subtotal = itemsData.reduce((sum, i) => sum + i.subtotal, 0)
    const shippingCost = parseFloat(body.shippingCost || 0)
    let discount = 0
    let couponId: string | null = null

    // Re-validate coupon server-side
    if (body.couponId) {
      const coupon = await prisma.coupon.findUnique({ where: { id: body.couponId } })
      if (coupon && coupon.storeId === storeId && coupon.isActive) {
        const now = new Date()
        if (coupon.startsAt <= now && (!coupon.expiresAt || coupon.expiresAt >= now)) {
          if (coupon.maxUses === 0 || coupon.usedCount < coupon.maxUses) {
            if (subtotal >= coupon.minPurchase) {
              if (coupon.type === "percentage") {
                discount = Math.min(subtotal * (coupon.value / 100), subtotal)
              } else {
                discount = Math.min(coupon.value, subtotal)
              }
              couponId = coupon.id
            }
          }
        }
      }
    }

    const total = Math.max(0, subtotal + shippingCost - discount)

    // ─── BCV rate at order time ───
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
        await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: { lastPurchaseAt: new Date() },
        })
      } else {
        const newCustomer = await prisma.customer.create({
          data: {
            storeId,
            name: body.customerName || "Cliente",
            phone: customerPhone,
            email: body.customerEmail || null,
            address: body.customerAddress || null,
            city: body.customerCity || null,
            state: body.customerState || null,
            totalSpent: 0,
            totalOrders: 0,
            lastPurchaseAt: new Date(),
          },
        })
        customerId = newCustomer.id
      }
    }

    // ─── Enterprise: resolve seller ───
    let sellerId: string | null = null
    let sellerName: string | null = null
    if (body.sellerId) {
      const seller = await prisma.seller.findUnique({ where: { id: body.sellerId } })
      if (seller && seller.storeId === storeId && seller.isActive) {
        sellerId = seller.id
        sellerName = seller.name
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
        discount,
        shippingCost,
        total,
        bcvRateAtOrder: latestRate?.rate || null,
        currency: body.currency || "USD",
        customerName: body.customerName,
        customerPhone: customerPhone,
        customerEmail: body.customerEmail || null,
        customerAddress: body.customerAddress || null,
        customerCity: body.customerCity || null,
        customerState: body.customerState || null,
        customerId,
        couponId,
        shippingMethod: body.shippingMethod || "pickup_agency",
        shippingAgency: body.shippingAgency || null,
        shippingAgencyAddress: body.shippingAgencyAddress || null,
        shippingAddress: body.shippingAddress || null,
        sellerId,
        sellerName,
        storeId: storeId,
        creditDays,
        dueDate,
        items: {
          create: itemsData.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            price: i.price,
            subtotal: i.subtotal,
            productName: i.productName,
          })),
        },
        payments: body.payment ? {
          create: {
            method: body.payment.method,
            amount: parseFloat(body.payment.amount),
            reference: body.payment.reference || null,
            bankOrigin: body.payment.bankOrigin || null,
            paidAt: body.payment.paidAt ? new Date(body.payment.paidAt) : null,
            receiptImage: body.payment.receiptImage || null,
            paymentAccountId: body.payment.paymentAccountId || null,
            status: body.payment.method === "credit" ? "verified" : "pending",
          },
        } : undefined,
      },
      include: {
        items: { include: { product: true } },
        payments: true,
      },
    })

    // ─── Decrement stock + stock movements + low stock alerts ───
    for (const item of itemsData) {
      const updated = await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      })
      await prisma.stockMovement.create({
        data: {
          type: "sale",
          quantity: -item.quantity,
          balance: updated.stock,
          concept: `Venta #${order.orderNumber}`,
          reference: order.id,
          productId: item.productId,
          storeId,
        },
      })
      if (updated.stock !== null && updated.stock > 0 && updated.stock <= 5) {
        await createAuditEntry({
          action: "stock.low",
          entity: "Product",
          entityId: updated.id,
          metadata: { productName: updated.name, remainingStock: updated.stock },
          storeId: current.store.id,
        })
      }
    }

    // ─── Enterprise: create seller commission ───
    if (sellerId) {
      const seller = await prisma.seller.findUnique({ where: { id: sellerId } })
      if (seller && seller.commissionType && seller.commissionValue) {
        let commissionAmount: number
        if (seller.commissionType === "percentage") {
          commissionAmount = total * (Number(seller.commissionValue) / 100)
        } else {
          commissionAmount = Number(seller.commissionValue)
        }
        await prisma.sellerCommission.create({
          data: {
            type: seller.commissionType,
            value: seller.commissionValue,
            amount: commissionAmount,
            status: "pending",
            sellerId: seller.id,
            orderId: order.id,
          },
        })
      }
    }

    // ─── Update customer totals ───
    if (customerId) {
      await prisma.customer.update({
        where: { id: customerId },
        data: {
          totalSpent: { increment: total },
          totalOrders: { increment: 1 },
        },
      })
    }

    // ─── Increment coupon usage ───
    if (couponId) {
      await prisma.coupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } },
      })
    }

    await createAuditEntry({ action: "order.created", entity: "Order", entityId: order.id, storeId: current.store.id, userId: current.userId })

    if (current.store.email) {
      enviarAlertaNuevoPedido(
        current.store.email,
        current.store.name,
        order.orderNumber,
        order.total
      ).catch(e => console.error("[order email error]", e))
    }

    return NextResponse.json(order, { status: 201 })
  } catch (error: any) {
    if (error?.message?.includes("No tienes")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Order creation error:", error)
    if (error?.code === "P2003") {
      return NextResponse.json(
        { error: "Error de integridad: uno de los productos o la tienda no existe. Intenta vaciar el carrito y agregar los productos de nuevo." },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error?.message || "Error al procesar el pedido" },
      { status: 500 }
    )
  }
}
