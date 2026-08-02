import { describe, expect, it, vi } from "vitest"
import { BusinessContextBuilder } from "@/lib/agent/context/business-context-builder"
import type { BusinessProfile } from "@/lib/agent/profile"
import type { MemoryItem } from "@/lib/agent/memory"
import type { StoreServiceContext } from "@/services/context"

const ctx: StoreServiceContext = {
  storeId: "store-1",
  userId: "user-1",
  negocioId: "negocio-1",
  role: "manager",
  plan: "business",
  storeName: "Mi Tienda",
}

function makeProfile(): BusinessProfile {
  return {
    general: {
      name: "Mi Tienda",
      slug: "mi-tienda",
      description: "Panadería artesanal en Caracas",
      country: "VE",
      phone: "+58",
      email: "a@b.c",
      address: "Calle 1",
      owner: { name: "Dueño", email: "d@b.c" },
      social: { instagram: null, facebook: null, whatsapp: null },
    },
    category: { planType: "tienda", template: "modern", modalidad: "tienda" },
    config: { storeHours: null, shippingCost: 0, freeShippingActive: false, freeShippingMinAmount: 0, showBolivares: true, creditDays: "5,10" },
    plan: { plan: "business", planStatus: "activo", planExpirationDate: null },
    metrics: {
      salesTodayRevenue: 250,
      salesTodayOrders: 5,
      salesMonthRevenue: 4000,
      inventoryLowStockCount: 2,
      inventoryTotalUnits: 100,
      customersTotal: 20,
      customersTotalSpent: 8000,
    },
    topProducts: [{ id: "p1", name: "Pan de jamón", quantity: 12 }],
    topCustomers: [{ id: "c1", name: "María", phone: null, orders: 4, total: 200 }],
    builtAt: "2026-01-01T00:00:00.000Z",
  }
}

function makeMemoryItem(): MemoryItem {
  return {
    id: "mem-1",
    storeId: "store-1",
    userId: "user-1",
    negocioId: "negocio-1",
    scope: "store",
    type: "long_term",
    kind: "fact",
    importance: "HIGH",
    key: "fact:negocio",
    value: "panadería artesanal",
    source: "user_message",
    expiresAt: undefined,
    accessCount: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  }
}

function makeProviders() {
  const profile = { build: vi.fn().mockResolvedValue(makeProfile()) }
  const memory = { search: vi.fn().mockResolvedValue([{ item: makeMemoryItem(), score: 0.9 }]) }
  return { profile: profile as never, memory: memory as never, profileMock: profile, memoryMock: memory }
}

describe("BusinessContextBuilder (FASE 3D)", () => {
  it("construye el bundle con negocio, usuario, plan, permisos, métricas y memoria", async () => {
    const { profileMock, memoryMock } = makeProviders()
    const builder = new BusinessContextBuilder({ profile: profileMock as never, memory: memoryMock as never })
    const bundle = await builder.build(ctx, "¿qué es tu negocio?")

    expect(bundle.business.name).toBe("Mi Tienda")
    expect(bundle.user.role).toBe("manager")
    expect(bundle.plan.plan).toBe("business")
    expect(bundle.permissions).toContain("inventory.read")
    expect(bundle.metrics!.salesTodayRevenue).toBe(250)
    expect(bundle.memory).toHaveLength(1)
    expect(memoryMock.search).toHaveBeenCalledWith(expect.objectContaining({ storeId: "store-1" }), "¿qué es tu negocio?", { limit: 8 })
    expect(profileMock.build).toHaveBeenCalledWith(ctx)
  })

  it("toBusinessFragment incluye el perfil (productos y clientes importantes)", () => {
    const { profileMock, memoryMock } = makeProviders()
    const builder = new BusinessContextBuilder({ profile: profileMock as never, memory: memoryMock as never })
    const bundle = {
      business: { id: "store-1", name: "Mi Tienda", slug: "mi-tienda", description: "Panadería", country: "VE", category: "tienda" },
      user: { id: "user-1", name: null, email: null, role: "manager" },
      plan: { plan: "business", planStatus: "activo", modalidad: "tienda" },
      permissions: [],
      metrics: makeProfile().metrics,
      profile: makeProfile(),
      memory: [],
      builtAt: "2026-01-01T00:00:00.000Z",
    }
    const fragment = builder.toBusinessFragment(bundle)
    expect(fragment).toContain("Mi Tienda")
    expect(fragment).toContain("Pan de jamón")
    expect(fragment).toContain("María")
  })

  it("toMemoryFragment lista la memoria relevante con su importancia", async () => {
    const { profileMock, memoryMock } = makeProviders()
    const builder = new BusinessContextBuilder({ profile: profileMock as never, memory: memoryMock as never })
    const bundle = await builder.build(ctx, "¿qué es tu negocio?")
    const fragment = builder.toMemoryFragment(bundle)
    expect(fragment).toContain("Memoria relevante del negocio")
    expect(fragment).toContain("[HIGH]")
    expect(fragment).toContain("panadería artesanal")
  })

  it("toAgentMemoryContext devuelve la lista plana para AgentRequest", async () => {
    const { profileMock, memoryMock } = makeProviders()
    const builder = new BusinessContextBuilder({ profile: profileMock as never, memory: memoryMock as never })
    const bundle = await builder.build(ctx, "¿qué es tu negocio?")
    const list = builder.toAgentMemoryContext(bundle)
    expect(list[0]).toMatchObject({ key: "fact:negocio", kind: "fact", importance: "HIGH" })
  })

  it("funciona sin providers de perfil/memoria (fallback básico)", async () => {
    const builder = new BusinessContextBuilder({})
    const bundle = await builder.build(ctx)
    expect(bundle.profile).toBeNull()
    expect(bundle.memory).toEqual([])
    expect(bundle.business.name).toBe("Mi Tienda")
    expect(builder.toBusinessFragment(bundle)).toContain("Mi Tienda")
    expect(builder.toMemoryFragment(bundle)).toBe("")
  })

  it("deriva permisos según el rol", async () => {
    const builder = new BusinessContextBuilder({})
    const bundle = await builder.build(ctx)
    expect(bundle.permissions.length).toBeGreaterThan(0)
  })

  it("trunca fragmentos al límite de tamaño", () => {
    makeProviders()
    const builder = new BusinessContextBuilder({}, { profilePromptLimit: 40, memoryPromptLimit: 40 })
    const bundle = { profile: makeProfile(), memory: [makeMemoryItem()] } as never
    const fragment = builder.toBusinessFragment(bundle)
    expect(fragment.length).toBeLessThanOrEqual(41)
  })
})
