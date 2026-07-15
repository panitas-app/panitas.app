import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateOrderNumber } from "@/lib/utils"
import { enviarAlertaNuevoPedido, sendEmail } from "@/lib/email"
import { templateOrderConfirmation } from "@/lib/email-templates"
import { csrfGuard } from "@/lib/csrf"
import { createAuditEntry } from "@/lib/audit"
import { rateLimit, getClientIp } from "@/lib/rate-limit"
import { safeErrorResponse, jsonError } from "@/lib/api-errors"
import { getPostHogClient } from "@/lib/posthog-server"

const MAX_ITEMS = 50
const MAX_QTY_PER_ITEM = 999
const MAX_TOTAL = 1_000_000

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const ip = getClientIp(request)
  const rl = await rateLimit(`checkout:${ip}`, 10, 60 * 1000)
  if (!rl.success) {
    return jsonError(`Demasiadas solicitudes. Intenta en ${Math.ceil(rl.resetIn / 1000)}s`, 429, { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) })
  }

  try {
    let body: any
    try { body = await request.json() } catch { return jsonError("JSON inválido", 400) }
    if (!body || typeof body !== "object") return jsonError("Cuerpo inválido", 400)

    const storeId = typeof body.storeId === "string" ? body.storeId.slice(0, 64) : ""
    if (!storeId) return jsonError("El ID de la tienda es requerido", 400)

    const storeExists = await prisma.store.findUnique({
      where: { id: storeId, isActive: true },
    })
    if (!storeExists) return jsonError("La tienda no existe o no está activa", 404)

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) return jsonError("El carrito está vacío", 400)
    if (body.items.length > MAX_ITEMS) return jsonError(`Máximo ${MAX_ITEMS} productos por pedido`, 400)

    const customerPhone = typeof body.customerPhone === "string" ? body.customerPhone.trim().slice(0, 30) : ""
    const customerName = typeof body.customerName === "string" ? body.customerName.trim().slice(0, 200) : ""

    if (!customerPhone || !customerName) return jsonError("El nombre y teléfono del cliente son requeridos", 400)

    // ─── Products: Fetch prices & stocks ───
    const productIds: string[] = body.items
      .map((i: any) => (typeof i?.productId === "string" ? i.productId : null))
      .filter((x: string | null): x is string => !!x)
    if (productIds.length !== body.items.length) return jsonError("Productos inválidos", 400)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, storeId },
      select: { id: true, stock: true, name: true, price: true, isActive: true },
    })
    const productMap = new Map(products.map((p) => [p.id, p]))

    // Check missing / inactive
    const missingIds = productIds.filter((id: string) => !productMap.has(id))
    if (missingIds.length > 0) return jsonError("Algunos productos en tu carrito ya no están disponibles. Intenta recargar la página.", 400)

    // Validate quantities and build item items
    const itemsData: Array<{ productId: string; quantity: number; price: number; subtotal: number; productName: string }> = []
    for (const item of body.items) {
      const product = productMap.get(item.productId)!
      if (!product.isActive) return jsonError(`El producto "${product.name}" ya no está disponible.`, 400)
      const qty = parseInt(String(item.quantity), 10)
      if (!Number.isInteger(qty) || qty <= 0 || qty > MAX_QTY_PER_ITEM) return jsonError("Cantidad no válida", 400)
      if (product.stock < qty) return jsonError(`Stock insuficiente para "${product.name}". Disponible: ${product.stock}, solicitado: ${qty}`, 400)
      itemsData.push({
        productId: product.id,
        quantity: qty,
        price: product.price,
        subtotal: qty * product.price,
        productName: product.name,
      })
    }

    // ─── Calculate totals server-side ───
    const subtotal = itemsData.reduce((sum, i) => sum + i.subtotal, 0)

    // Server-side Shipping Validation (protects against client modifications)
    const allowedShippingMethods = ["pickup_agency", "pickup_store", "delivery"]
    const shippingMethod = allowedShippingMethods.includes(body.shippingMethod) ? body.shippingMethod : "pickup_agency"
    const storeObj = storeExists as any
    let shippingCost = 0

    if (shippingMethod !== "pickup_store") {
      const freeShippingActive = storeObj.freeShippingActive ?? false
      const freeShippingMinAmount = storeObj.freeShippingMinAmount ?? 0
      const isFreeShippingEligible = freeShippingActive && subtotal >= freeShippingMinAmount

      if (!isFreeShippingEligible) {
        shippingCost = storeObj.shippingCost ?? 0
      }
    }

    let discount = 0
    let couponId: string | null = null

    // Validate Coupon
    if (body.couponId && typeof body.couponId === "string" && body.couponId.length <= 64) {
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

    const total = Math.max(0, Math.min(MAX_TOTAL, subtotal + shippingCost - discount))

    // Fetch exchange rate from local DB (highly efficient)
    const latestRate = await prisma.bcvRate.findFirst({ orderBy: { date: "desc" } })

    // ─── Execute Atomics inside transaction ───
    const order = await prisma.$transaction(async (tx) => {
      // 1. Find or create customer (for CRM)
      let customerId: string
      const existingCustomer = await tx.customer.findUnique({
        where: { storeId_phone: { storeId, phone: customerPhone } },
      })

      if (existingCustomer) {
        customerId = existingCustomer.id
        await tx.customer.update({
          where: { id: existingCustomer.id },
          data: {
            name: customerName, // Update name if it changed
            lastPurchaseAt: new Date(),
            totalSpent: { increment: total },
            totalOrders: { increment: 1 },
          },
        })
      } else {
        const newCustomer = await tx.customer.create({
          data: {
            storeId,
            name: customerName,
            phone: customerPhone,
            email: body.customerEmail || null,
            address: body.customerAddress || null,
            city: body.customerCity || null,
            state: body.customerState || null,
            totalSpent: total,
            totalOrders: 1,
            lastPurchaseAt: new Date(),
          },
        })
        customerId = newCustomer.id
      }

      // 2. Validate and decrement stock again within transaction to prevent race conditions
      for (const item of itemsData) {
        const prod = await tx.product.findUnique({
          where: { id: item.productId },
          select: { name: true, stock: true },
        })
        if (!prod || prod.stock < item.quantity) {
          throw new Error(`Stock insuficiente para "${item.productName}" debido a una compra concurrente.`)
        }
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      }

      // 3. Increment coupon usage
      if (couponId) {
        const couponCheck = await tx.coupon.findUnique({
          where: { id: couponId },
          select: { maxUses: true, usedCount: true },
        })
        if (couponCheck && couponCheck.maxUses > 0 && couponCheck.usedCount >= couponCheck.maxUses) {
          throw new Error("El cupón ya ha alcanzado su límite de usos.")
        }
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        })
      }

      // 4. Create Order with items and payment details
      return tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          status: "pending",
          subtotal,
          discount,
          shippingCost,
          total,
          bcvRateAtOrder: latestRate?.rate || null,
          currency: typeof body.currency === "string" && (body.currency === "USD" || body.currency === "VES") ? body.currency : "USD",
          customerName: customerName,
          customerPhone: customerPhone,
          customerEmail: typeof body.customerEmail === "string" && body.customerEmail.length > 0 ? body.customerEmail.slice(0, 254) : null,
          customerAddress: typeof body.customerAddress === "string" ? body.customerAddress.slice(0, 500) : null,
          customerCity: typeof body.customerCity === "string" ? body.customerCity.slice(0, 100) : null,
          customerState: typeof body.customerState === "string" ? body.customerState.slice(0, 100) : null,
          customerId,
          couponId,
          shippingMethod: shippingMethod,
          shippingAgency: typeof body.shippingAgency === "string" ? body.shippingAgency.slice(0, 100) : null,
          shippingAgencyAddress: typeof body.shippingAgencyAddress === "string" ? body.shippingAgencyAddress.slice(0, 500) : null,
          shippingAddress: typeof body.shippingAddress === "string" ? body.shippingAddress.slice(0, 500) : null,
          storeId: storeId,
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
              method: typeof body.payment.method === "string" ? body.payment.method.slice(0, 50) : "manual",
              amount: Number.isFinite(parseFloat(body.payment.amount)) ? Math.min(MAX_TOTAL, Math.max(0, parseFloat(body.payment.amount))) : total,
              reference: typeof body.payment.reference === "string" ? body.payment.reference.slice(0, 100) : null,
              bankOrigin: typeof body.payment.bankOrigin === "string" ? body.payment.bankOrigin.slice(0, 100) : null,
              paidAt: body.payment.paidAt ? new Date(body.payment.paidAt) : null,
              receiptImage: typeof body.payment.receiptImage === "string" ? body.payment.receiptImage.slice(0, 2048) : null,
              paymentAccountId: typeof body.payment.paymentAccountId === "string" ? body.payment.paymentAccountId.slice(0, 64) : null,
              status: "pending",
            },
          } : undefined,
        },
        include: {
          items: true,
          payments: true,
        },
      })
    })

    await createAuditEntry({ action: "order.created", entity: "Order", entityId: order.id, metadata: { orderNumber: order.orderNumber, total: order.total }, storeId: storeExists.id })

    const posthog = getPostHogClient()
    posthog.capture({
      distinctId: storeId,
      event: "order_created",
      properties: {
        order_number: order.orderNumber,
        store_id: storeId,
        item_count: itemsData.length,
        subtotal,
        discount,
        shipping_cost: shippingCost,
        total,
        currency: order.currency,
        shipping_method: shippingMethod,
        coupon_used: !!couponId,
      },
    })
    await posthog.flush()

    if (storeExists.email) {
      enviarAlertaNuevoPedido(
        storeExists.email,
        storeExists.name,
        order.orderNumber,
        order.total
      ).catch(e => console.error("[checkout email error]", e))
    }

    // Send confirmation to customer
    if (order.customerEmail) {
      const itemsHtml = order.items.map(i =>
        `<tr><td>${i.productName || "Producto"}</td><td>${i.quantity}</td><td>$${i.price.toFixed(2)}</td></tr>`
      ).join("")
      const itemsTable = `<table><tr><th>Producto</th><th>Cant.</th><th>Precio</th></tr>${itemsHtml}</table>`
      sendEmail(
        order.customerEmail,
        `Confirmación de tu pedido #${order.orderNumber} — ${storeExists.name}`,
        templateOrderConfirmation(order.customerName, order.orderNumber, storeExists.name, itemsTable, order.total),
        "order_confirmation"
      ).catch(e => console.error("[checkout confirmation email error]", e))
    }

    return NextResponse.json(order, { status: 201 })
  } catch (error: any) {
    // Allow user-facing stock/concurrency messages to bubble up
    if (error instanceof Error) {
      const msg = error.message
      if (msg.includes("Stock insuficiente") || msg.includes("límite de usos")) {
        return NextResponse.json({ error: msg }, { status: 400 })
      }
    }
    return safeErrorResponse(error, "Error al procesar tu pedido")
  }
}
