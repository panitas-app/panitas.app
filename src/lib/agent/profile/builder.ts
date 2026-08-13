/**
 * Business Profile (FASE 3D).
 *
 * Perfil inteligente del negocio: información general, categoría, configuración,
 * productos y clientes importantes y métricas principales. Es una vista derivada
 * (se construye bajo demanda) a partir de Store + Negocio + Analytics + ventas.
 *
 * El `storeId` viene del contexto autenticado: el perfil jamás cruza negocios.
 */
import type { StoreServiceContext } from "@/services/context"
import { BusinessRepository } from "@/repositories/business.repository"
import { SalesRepository } from "@/repositories/sales.repository"
import { getCustomerMetrics } from "@/lib/analytics"
import { getInventoryHealth } from "@/lib/analytics"
import { getSalesMetrics } from "@/lib/analytics"

export interface BusinessProfileOptions {
  topProducts?: number
  topCustomers?: number
  monthAgoDays?: number
}

export interface BusinessProfileTopProduct {
  id: string
  name: string
  quantity: number
}

export interface BusinessProfileTopCustomer {
  id: string
  name: string
  phone: string | null
  orders: number
  total: number
}

export interface BusinessProfile {
  general: {
    name: string
    slug: string | null
    description: string | null
    country: string | null
    phone: string | null
    email: string | null
    address: string | null
    owner: {
      name: string | null
      email: string | null
    }
    social: {
      instagram: string | null
      facebook: string | null
      whatsapp: string | null
    }
  }
  category: {
    planType: string | null
    template: string | null
    modalidad: string | null
  }
  config: {
    storeHours: string | null
    shippingCost: number
    freeShippingActive: boolean
    freeShippingMinAmount: number
    showBolivares: boolean
    creditDays: string
  }
  plan: {
    plan: string
    planStatus: string | null
    planExpirationDate: string | null
  }
  metrics: {
    salesTodayRevenue: number
    salesTodayOrders: number
    salesMonthRevenue: number
    inventoryLowStockCount: number
    inventoryTotalUnits: number
    customersTotal: number
    customersTotalSpent: number
  }
  topProducts: BusinessProfileTopProduct[]
  topCustomers: BusinessProfileTopCustomer[]
  builtAt: string
}

export interface BusinessProfileProviders {
  business?: BusinessRepository
  sales?: SalesRepository
}

export class BusinessProfileBuilder {
  private readonly business: BusinessRepository
  private readonly sales: SalesRepository
  private readonly options: Required<BusinessProfileOptions>

  constructor(providers: BusinessProfileProviders = {}, options: BusinessProfileOptions = {}) {
    this.business = providers.business ?? new BusinessRepository()
    this.sales = providers.sales ?? new SalesRepository()
    this.options = {
      topProducts: options.topProducts ?? 5,
      topCustomers: options.topCustomers ?? 5,
      monthAgoDays: options.monthAgoDays ?? 30,
    }
  }

  async build(ctx: StoreServiceContext): Promise<BusinessProfile> {
    const [store, negocio, sales, inventory, customers, user] = await Promise.all([
      this.business.getStore(ctx.storeId),
      this.business.getNegocio(ctx.negocioId),
      getSalesMetrics(ctx.storeId),
      getInventoryHealth(ctx.storeId),
      getCustomerMetrics(ctx.storeId),
      this.business.getUser(ctx.userId),
    ])

    const from = new Date()
    from.setDate(from.getDate() - this.options.monthAgoDays)

    const [topProductRows, topCustomerRows] = await Promise.all([
      this.sales.topProducts(ctx.storeId, from, undefined, this.options.topProducts),
      this.sales.frequentCustomers(ctx.storeId, from, undefined, this.options.topCustomers),
    ])

    // Resolver nombres en un segundo pase (los groupBy solo devuelven IDs).
    const [productRows, customerRows] = await Promise.all([
      this.sales.productsByIds(topProductRows.map((p) => p.productId).filter((id): id is string => Boolean(id))),
      this.sales.customersByIds(topCustomerRows.map((c) => c.customerId!).filter(Boolean)),
    ])

    const productName = new Map(productRows.map((p) => [p.id, p.name]))
    const customerName = new Map(customerRows.map((c) => [c.id, c]))

    return {
      general: {
        name: store?.name ?? negocio?.nombre ?? "",
        slug: store?.slug ?? null,
        description: store?.description ?? null,
        country: negocio?.pais ?? null,
        phone: store?.phone ?? null,
        email: store?.email ?? null,
        address: store?.address ?? null,
        owner: {
          name: user?.name ?? null,
          email: user?.email ?? null,
        },
        social: {
          instagram: store?.instagram ?? null,
          facebook: store?.facebook ?? null,
          whatsapp: store?.whatsapp ?? null,
        },
      },
      category: {
        planType: store?.planType ?? null,
        template: store?.template ?? null,
        modalidad: negocio?.modalidad ?? null,
      },
      config: {
        storeHours: store?.storeHours ?? null,
        shippingCost: store?.shippingCost ?? 0,
        freeShippingActive: store?.freeShippingActive ?? false,
        freeShippingMinAmount: store?.freeShippingMinAmount ?? 0,
        showBolivares: store?.showBolivares ?? true,
        creditDays: store?.creditDays ?? "5,10,15,30",
      },
      plan: {
        plan: store?.plan ?? "free",
        planStatus: store?.planStatus ?? negocio?.planEstado ?? null,
        planExpirationDate: store?.planExpirationDate?.toISOString() ?? null,
      },
      metrics: {
        salesTodayRevenue: sales.today.revenue,
        salesTodayOrders: sales.today.totalOrders,
        salesMonthRevenue: sales.month.revenue,
        inventoryLowStockCount: inventory.lowStock.length,
        inventoryTotalUnits: inventory.overview.totalUnits,
        customersTotal: customers.total,
        customersTotalSpent: customers.totalSpent,
      },
      topProducts: topProductRows
        .filter((p): p is typeof p & { productId: string } => p.productId !== null)
        .filter((p) => productName.has(p.productId))
        .map((p) => ({
          id: p.productId,
          name: productName.get(p.productId)!,
          quantity: p._sum.quantity ?? 0,
        })),
      topCustomers: topCustomerRows
        .filter((c) => c.customerId && customerName.has(c.customerId))
        .map((c) => ({
          id: c.customerId!,
          name: customerName.get(c.customerId!)!.name,
          phone: customerName.get(c.customerId!)!.phone,
          orders: c._count._all,
          total: c._sum.total ?? 0,
        })),
      builtAt: new Date().toISOString(),
    }
  }

  /** Versión compacta del perfil para inyectar en el system prompt. */
  toPromptFragment(profile: BusinessProfile): string {
    return profileToPromptFragment(profile)
  }
}

/** Fragmento compacto del perfil para el system prompt (función pura). */
export function profileToPromptFragment(profile: BusinessProfile): string {
  const lines: string[] = [
    `Negocio: ${profile.general.name} (${profile.category.modalidad ?? profile.category.planType ?? "tienda"}).`,
  ]
  if (profile.general.description) lines.push(`Descripción: ${profile.general.description}`)
  lines.push(
    `Ventas hoy: $${profile.metrics.salesTodayRevenue.toFixed(2)} (${profile.metrics.salesTodayOrders} órdenes) · ` +
      `Mes: $${profile.metrics.salesMonthRevenue.toFixed(2)} · Stock bajo: ${profile.metrics.inventoryLowStockCount} · ` +
      `Clientes: ${profile.metrics.customersTotal} ($${profile.metrics.customersTotalSpent.toFixed(2)}).`
  )
  if (profile.topProducts.length > 0) {
    lines.push(`Productos más vendidos (30d): ${profile.topProducts.map((p) => `${p.name} (${p.quantity})`).join(", ")}.`)
  }
  if (profile.topCustomers.length > 0) {
    lines.push(`Clientes más valiosos: ${profile.topCustomers.map((c) => `${c.name} (${c.orders} órdenes)`).join(", ")}.`)
  }
  return lines.join("\n")
}
