import { generateOrderNumber } from "@/lib/utils"
import { enviarAlertaNuevoPedido, sendEmail } from "@/lib/email"
import { templateOrderConfirmation } from "@/lib/email-templates"
import { createAuditEntry } from "@/lib/audit"
import { OrderRepository } from "@/repositories/order.repository"
import { ProductRepository } from "@/repositories/product.repository"
import { CustomerService } from "@/services/customer.service"
import { serviceError } from "@/services/errors"
import { eventService } from "@/events/event.service"
import type { StoreServiceContext } from "@/services/context"

export type OrderListOptions = {
  status?: string | null
  skip?: number
  take?: number
}

type OrderItemInput = {
  productId: string
  quantity: number
  price: number
  subtotal: number
  productName: string
}

type OrderPaymentInput = {
  method: string
  amount: number
  reference?: string | null
  bankOrigin?: string | null
  paidAt?: string | null
  receiptImage?: string | null
  paymentAccountId?: string | null
  status?: string | null
}

type OrderCreateInput = {
  source?: string
  storeId?: string
  items?: Array<{
    productId: string
    quantity: string | number
    price?: string | number
    useWholesale?: boolean
  }>
  shippingCost?: string | number
  couponId?: string
  customerPhone?: string
  customerName?: string
  customerDocumentId?: string
  customerEmail?: string
  customerAddress?: string
  customerCity?: string
  customerState?: string
  sellerId?: string
  creditDays?: string | number
  creditTerm?: string
  downPayment?: string | number
  currency?: string
  cashRegisterSessionId?: string
  shippingMethod?: string
  shippingAgency?: string
  shippingAgencyAddress?: string
  shippingAddress?: string
  payments?: OrderPaymentInput[]
  payment?: OrderPaymentInput
}

export class OrderService {
  constructor(
    private readonly repo = new OrderRepository(),
    private readonly productRepo = new ProductRepository(),
    private readonly customerService = new CustomerService()
  ) {}

  list(ctx: StoreServiceContext, options: OrderListOptions) {
    return this.repo.list({
      storeId: ctx.storeId,
      status: options.status || undefined,
      skip: options.skip,
      take: options.take,
    })
  }

  async getById(ctx: StoreServiceContext, id: string) {
    const order = await this.repo.findById(id)
    if (!order) throw serviceError("Orden no encontrada", 404)
    if (order.storeId !== ctx.storeId) throw serviceError("No autorizado", 403)
    return order
  }

  async create(ctx: StoreServiceContext, body: OrderCreateInput) {
    const isPosOrder = body.source === "pos"

    let storeId = body.storeId
    if (!storeId) {
      storeId = ctx.storeId
    } else {
      const storeExists = await this.repo.findStoreById(storeId)
      if (!storeExists) {
        throw serviceError("Tienda no encontrada", 404)
      }
    }

    // ─── Products: fetch real prices from DB ───
    const productIds = body.items!.map((i) => i.productId)
    const products = await this.productRepo.findByIds(productIds)
    const productMap = new Map(products.map((p) => [p.id, p]))

    // Check missing
    const missingIds = productIds.filter((id: string) => !productMap.has(id))
    if (missingIds.length > 0) {
      throw serviceError(`Productos no encontrados: ${missingIds.join(", ")}`, 400)
    }

    // Check stock & build items with server-validated prices
    const itemsData: OrderItemInput[] = []
    for (const item of body.items!) {
      const product = productMap.get(item.productId)!
      const qty = parseInt(String(item.quantity))
      if (product.stock < qty) {
        throw serviceError(
          `Stock insuficiente para "${product.name}". Disponible: ${product.stock}, solicitado: ${qty}`,
          400
        )
      }

      // Determine price: wholesale, client-supplied, or default
      let unitPrice = product.price

      // Wholesale pricing
      const useWholesale = item.useWholesale !== false
      if (useWholesale && product.isWholesale) {
        let foundScale = false
        if (product.wholesaleScales) {
          try {
            const scales =
              typeof product.wholesaleScales === "string"
                ? JSON.parse(product.wholesaleScales)
                : product.wholesaleScales
            if (Array.isArray(scales)) {
              const sorted = [...scales].sort(
                (a, b) => (b.quantity || 0) - (a.quantity || 0)
              )
              const match = sorted.find((s) => qty >= (s.quantity || 0))
              if (match && match.price > 0) {
                unitPrice = match.price
                foundScale = true
              }
            }
          } catch (e) {
            console.error("[unhandled error]", e)
          }
        }
        if (!foundScale && product.wholesalePrice && qty >= 5) {
          unitPrice = product.wholesalePrice
        }
      }

      // Client-supplied price with validation (POS discounts etc.)
      if (item.price !== undefined && item.price !== null) {
        const clientPrice = parseFloat(String(item.price))
        const minPrice = Math.max(product.costPrice || 0, product.price * 0.5)
        if (clientPrice >= minPrice && clientPrice <= product.price) {
          unitPrice = clientPrice
        }
      }

      itemsData.push({
        productId: product.id,
        quantity: qty,
        price: unitPrice,
        subtotal: qty * unitPrice,
        productName: product.name,
      })
    }

    // ─── Calculate totals server-side ───
    const subtotal = itemsData.reduce((sum, i) => sum + i.subtotal, 0)
    const shippingCost = parseFloat(String(body.shippingCost || 0))
    let discount = 0
    let couponId: string | null = null

    // Re-validate coupon server-side
    if (body.couponId) {
      const coupon = await this.repo.findCouponById(body.couponId)
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
    const latestRate = await this.repo.findLatestBcvRate()

    // ─── Find or create customer ───
    const customerPhone = body.customerPhone?.trim()
    let customerId: string | undefined
    if (customerPhone) {
      const { customer } = await this.customerService.findOrCreateByPhone(ctx, {
        phone: customerPhone,
        name: body.customerName || null,
        documentId: body.customerDocumentId || null,
        email: body.customerEmail || null,
        address: body.customerAddress || null,
        city: body.customerCity || null,
        state: body.customerState || null,
      })
      customerId = customer.id
    }

    // ─── Enterprise: resolve seller ───
    let sellerId: string | null = null
    let sellerName: string | null = null
    if (body.sellerId) {
      const seller = await this.repo.findSellerById(body.sellerId)
      if (seller && seller.storeId === storeId && seller.isActive) {
        sellerId = seller.id
        sellerName = seller.name
      }
    }

    // ─── Credit / Installments ───
    let dueDate: Date | undefined
    const creditDays = body.creditDays ? parseInt(String(body.creditDays)) : null
    if (creditDays && creditDays > 0) {
      dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + creditDays)
    }

    // Parse payments array or single payment
    let paymentsInput: OrderPaymentInput[] | undefined = body.payments
    if (!paymentsInput && body.payment) {
      paymentsInput = [body.payment]
    }

    const downPayment = body.downPayment ? parseFloat(String(body.downPayment)) : 0
    const creditTerm = body.creditTerm || null

    // Parse dynamic cuotas: "cuotas_N_15d"
    let cuotasCount = 0
    if (creditTerm?.startsWith("cuotas_")) {
      cuotasCount = parseInt(creditTerm.split("_")[1]) || 0
    }
    const totalCredito = cuotasCount > 0 ? total - downPayment : 0

    // Build installment data for credit sales
    let installmentsCreate: Array<{ number: number; amount: number; dueDate: Date; status: string }> | undefined
    if (cuotasCount > 0 && totalCredito > 0) {
      const eachAmount = totalCredito / cuotasCount
      const now = new Date()
      installmentsCreate = Array.from({ length: cuotasCount }, (_, i) => {
        const d = new Date(now)
        d.setDate(d.getDate() + (i + 1) * 15)
        return { number: i + 1, amount: eachAmount, dueDate: d, status: "pending" }
      })
    }

    // Determine paymentStatus
    let paymentStatus = "pending"
    if (cuotasCount > 0) {
      paymentStatus = downPayment > 0 ? "partial" : "credit"
    } else if (paymentsInput && paymentsInput.length > 0) {
      const allVerified = paymentsInput.every((p) => p.status === "verified" || p.method !== "credit")
      paymentStatus = allVerified ? "paid" : "pending"
    }

    // ─── Create order (sequential: no nested creates, Neon HTTP doesn't support implicit transactions) ───
    const order = await this.repo.create({
      orderNumber: generateOrderNumber(),
      status: "pending",
      paymentStatus,
      subtotal,
      discount,
      shippingCost,
      total,
      bcvRateAtOrder: latestRate?.rate || null,
      currency: body.currency || "USD",
      customerName: body.customerName as string,
      customerPhone: customerPhone as string,
      customerEmail: body.customerEmail || null,
      customerAddress: body.customerAddress || null,
      customerCity: body.customerCity || null,
      customerState: body.customerState || null,
      customerId,
      couponId,
      cashRegisterSessionId: body.cashRegisterSessionId || null,
      shippingMethod: body.shippingMethod || "pickup_agency",
      shippingAgency: body.shippingAgency || null,
      shippingAgencyAddress: body.shippingAgencyAddress || null,
      shippingAddress: body.shippingAddress || null,
      sellerId,
      sellerName,
      storeId: storeId,
      posPin: isPosOrder,
      creditDays,
      dueDate,
      downPayment: downPayment > 0 ? downPayment : null,
      creditTerm,
      totalCredito: totalCredito > 0 ? totalCredito : null,
    })

    // ─── Create order items (sequential) ───
    for (const item of itemsData) {
      await this.repo.createItem({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
        productName: item.productName,
      })
    }

    // ─── Create payments (sequential) ───
    if (paymentsInput && paymentsInput.length > 0) {
      for (const p of paymentsInput) {
        await this.repo.createPayment({
          orderId: order.id,
          method: p.method,
          amount: parseFloat(String(p.amount)),
          reference: p.reference || null,
          bankOrigin: p.bankOrigin || null,
          paidAt: p.paidAt
            ? new Date(p.paidAt)
            : (p.status || (p.method === "credit" ? "verified" : "pending")) === "verified"
              ? new Date()
              : null,
          receiptImage: p.receiptImage || null,
          paymentAccountId: p.paymentAccountId || null,
          status: p.status || (p.method === "credit" ? "verified" : "pending"),
        })
      }
    }

    // ─── Create installments (sequential) ───
    if (installmentsCreate) {
      for (const inst of installmentsCreate) {
        await this.repo.createInstallment({
          orderId: order.id,
          number: inst.number,
          amount: inst.amount,
          dueDate: inst.dueDate,
          status: inst.status,
        })
      }
    }

    // ─── Decrement stock + stock movements + low stock alerts ───
    for (const item of itemsData) {
      const updated = await this.repo.decrementStock(item.productId, item.quantity)
      await this.repo.recordStockMovement({
        type: "sale",
        quantity: -item.quantity,
        balance: updated.stock,
        concept: `Venta #${order.orderNumber}`,
        reference: order.id,
        productId: item.productId,
        storeId,
      })
      if (updated.stock !== null && updated.stock > 0 && updated.stock <= 5) {
        await createAuditEntry({
          action: "stock.low",
          entity: "Product",
          entityId: updated.id,
          metadata: { productName: updated.name, remainingStock: updated.stock },
          storeId: ctx.storeId,
        })
        eventService.emit("inventory.low_stock", {
          productId: updated.id,
          storeId,
          productName: updated.name,
          remainingStock: updated.stock,
        })
      }
    }

    // ─── Enterprise: create seller commission ───
    if (sellerId) {
      const seller = await this.repo.findSellerById(sellerId)
      if (seller && seller.commissionType && seller.commissionValue) {
        let commissionAmount: number
        if (seller.commissionType === "percentage") {
          commissionAmount = total * (Number(seller.commissionValue) / 100)
        } else {
          commissionAmount = Number(seller.commissionValue)
        }
        await this.repo.createSellerCommission({
          type: seller.commissionType,
          value: seller.commissionValue,
          amount: commissionAmount,
          status: "pending",
          sellerId: seller.id,
          orderId: order.id,
        })
      }
    }

    // ─── Update customer totals ───
    if (customerId) {
      await this.customerService.updateTotals(ctx, customerId, total, 1)
    }

    // ─── Increment coupon usage ───
    if (couponId) {
      await this.repo.updateCouponUsedCount(couponId)
    }

    await createAuditEntry({
      action: "order.created",
      entity: "Order",
      entityId: order.id,
      storeId: ctx.storeId,
      userId: ctx.userId,
    })

    if (!isPosOrder) {
      if (ctx.storeEmail) {
        enviarAlertaNuevoPedido(ctx.storeEmail, ctx.storeName || "Tienda", order.orderNumber, order.total).catch((e) =>
          console.error("[order email error]", e)
        )
      }

      // Send confirmation to customer
      if (order.customerEmail) {
        const itemsHtml = itemsData
          .map((i) => `<tr><td>${i.productName || "Producto"}</td><td>${i.quantity}</td><td>$${i.price.toFixed(2)}</td></tr>`)
          .join("")
        const itemsTable = `<table><tr><th>Producto</th><th>Cant.</th><th>Precio</th></tr>${itemsHtml}</table>`
        sendEmail(
          order.customerEmail,
          `Confirmación de tu pedido #${order.orderNumber} — ${ctx.storeName || "Tienda"}`,
          templateOrderConfirmation(order.customerName, order.orderNumber, ctx.storeName || "Tienda", itemsTable, order.total),
          "order_confirmation"
        ).catch((e) => console.error("[order confirmation email error]", e))
      }
    }

    eventService.emit("sale.created", {
      orderId: order.id,
      storeId,
      total,
      orderNumber: order.orderNumber,
    })

    eventService.emit("order.created", {
      orderId: order.id,
      storeId,
      orderNumber: order.orderNumber,
      total,
      paymentStatus: order.paymentStatus,
    })

    // ─── Fetch complete order with relations for response ───
    const fullOrder = await this.repo.findById(order.id)

    return fullOrder || order
  }
}
